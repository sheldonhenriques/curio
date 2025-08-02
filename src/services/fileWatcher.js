// Dynamic imports to handle both CommonJS and ES modules in sandbox
let chokidar, path, fs;

const initializeModules = async () => {
  try {
    // Try ES module import first
    const chokidarModule = await import('chokidar');
    chokidar = chokidarModule.default || chokidarModule;
  } catch (e) {
    try {
      // Fallback to CommonJS require
      chokidar = require('chokidar');
    } catch (e2) {
      console.error('❌ Failed to load chokidar:', e2);
      process.exit(1);
    }
  }

  try {
    path = await import('path');
  } catch (e) {
    path = require('path');
  }

  try {
    fs = await import('fs');
  } catch (e) {
    fs = require('fs');
  }
};

/**
 * File watcher service that monitors sandbox files and sends webhook notifications
 * This script runs inside the sandbox environment
 */

const WEBHOOK_URL = process.env.CURIO_WEBHOOK_URL || 'http://localhost:3000/api/webhook/file-changes';
const PROJECT_ID = process.env.CURIO_PROJECT_ID;
const SANDBOX_ID = process.env.CURIO_SANDBOX_ID;
const PROJECT_DIR = process.env.CURIO_PROJECT_DIR || '../project'; // Default to relative path from .curio

// Get the absolute path to the project directory to watch
const getProjectPath = () => {
  if (path.isAbsolute(PROJECT_DIR)) {
    return PROJECT_DIR;
  }
  // If relative, resolve from current directory (.curio)
  return path.resolve(process.cwd(), PROJECT_DIR);
};

// Patterns to watch for new pages/components (relative to project directory)
const WATCH_PATTERNS = [
  'src/app/**/*.{js,jsx,ts,tsx}',
  'src/pages/**/*.{js,jsx,ts,tsx}',
  'src/components/**/*.{js,jsx,ts,tsx}',
  'pages/**/*.{js,jsx,ts,tsx}',
  'components/**/*.{js,jsx,ts,tsx}'
];

// Files to ignore
const IGNORE_PATTERNS = [
  '**/node_modules/**',
  '**/.next/**',
  '**/dist/**',
  '**/build/**',
  '**/.git/**',
  '**/coverage/**',
  '**/*.test.{js,jsx,ts,tsx}',
  '**/*.spec.{js,jsx,ts,tsx}'
];

class FileWatcher {
  constructor() {
    this.watcher = null;
    this.debounceTimeout = null;
    this.pendingChanges = new Set();
    
    // Set up signal handler for explicit scan requests
    process.on('SIGUSR1', () => {
      console.log('📡 Received SIGUSR1 signal - triggering initial scan');
      this.scanExistingRoutes();
    });
  }

  async start() {
    const projectPath = getProjectPath();
    
    console.log('🔍 Starting file watcher for Curio...');
    console.log('Project ID:', PROJECT_ID);
    console.log('Sandbox ID:', SANDBOX_ID);
    console.log('Webhook URL:', WEBHOOK_URL);
    console.log('Project Directory:', projectPath);
    console.log('Current Working Directory:', process.cwd());

    if (!chokidar) {
      throw new Error('Chokidar module not loaded');
    }

    // Create absolute watch patterns based on project directory
    const absoluteWatchPatterns = WATCH_PATTERNS.map(pattern => 
      path.join(projectPath, pattern)
    );

    console.log('Watch patterns:', absoluteWatchPatterns);

    this.watcher = chokidar.watch(absoluteWatchPatterns, {
      ignored: IGNORE_PATTERNS.map(pattern => path.join(projectPath, pattern)),
      ignoreInitial: true,
      persistent: true,
      depth: 10
    });

    this.watcher
      .on('add', (filePath) => this.handleFileChange('add', filePath))
      .on('change', (filePath) => this.handleFileChange('change', filePath))
      .on('unlink', (filePath) => this.handleFileChange('unlink', filePath))
      .on('error', (error) => console.error('File watcher error:', error))
      .on('ready', () => {
        console.log('✅ File watcher ready and monitoring for new files');
        console.log('💡 Initial scan can be triggered via SIGUSR1 signal if needed');
      });
  }

  handleFileChange(eventType, filePath) {
    // Only process page-like components
    if (!this.isPageComponent(filePath)) {
      return;
    }

    console.log(`📁 File ${eventType}: ${filePath}`);
    this.pendingChanges.add({ eventType, filePath, timestamp: Date.now() });

    // Debounce to avoid too many webhook calls
    clearTimeout(this.debounceTimeout);
    this.debounceTimeout = setTimeout(() => {
      this.processChanges();
    }, 2000); // 2 second debounce
  }

  isPageComponent(filePath) {
    const projectPath = getProjectPath();
    const relativePath = path.relative(projectPath, filePath);
    
    // Check if it's in a pages or app directory (Next.js routing)
    if (relativePath.includes('/app/') || relativePath.includes('/pages/') || 
        relativePath.startsWith('src/app/') || relativePath.startsWith('pages/')) {
      return true;
    }

    // Check if it looks like a page component
    const pagePatterns = [
      /page\.(js|jsx|ts|tsx)$/,
      /index\.(js|jsx|ts|tsx)$/,
      /\[.*\]\.(js|jsx|ts|tsx)$/,
      /layout\.(js|jsx|ts|tsx)$/
    ];

    return pagePatterns.some(pattern => pattern.test(path.basename(filePath)));
  }

  async processChanges() {
    if (this.pendingChanges.size === 0) return;

    const changes = Array.from(this.pendingChanges);
    this.pendingChanges.clear();

    for (const change of changes) {
      try {
        await this.sendWebhook(change);
      } catch (error) {
        console.error('Failed to send webhook:', error);
      }
    }
  }

  async sendWebhook(change) {
    const { eventType, filePath, timestamp } = change;
    
    // Extract route information
    const routeInfo = this.extractRouteInfo(filePath);
    if (!routeInfo) {
      console.log('⏭️  Skipping webhook for non-page file:', filePath);
      return;
    }

    const payload = {
      type: 'file-change',
      projectId: PROJECT_ID,
      sandboxId: SANDBOX_ID,
      eventType,
      filePath,
      routeInfo,
      timestamp
    };

    console.log('📤 Sending webhook:', payload);

    try {
      const response = await fetch(WEBHOOK_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        throw new Error(`Webhook failed with status: ${response.status}`);
      }

      console.log('✅ Webhook sent successfully');
    } catch (error) {
      console.error('❌ Webhook error:', error);
    }
  }

  extractRouteInfo(filePath) {
    const projectPath = getProjectPath();
    const relativePath = path.relative(projectPath, filePath);
    const fileName = path.basename(filePath, path.extname(filePath));
    
    console.log('Extracting route info for:', filePath);
    console.log('Project path:', projectPath);
    console.log('Relative path:', relativePath);
    
    // Skip layout, loading, error, and other non-page files early
    if (['layout', 'loading', 'error', 'not-found'].includes(fileName)) {
      console.log('⏭️  Skipping non-page component in sandbox:', fileName);
      return null;
    }
    
    // Extract route from Next.js app router structure
    if (relativePath.includes('/app/') || relativePath.startsWith('src/app/')) {
      const appPath = relativePath.includes('/app/') 
        ? relativePath.split('/app/')[1]
        : relativePath.replace('src/app/', '');
      const routeParts = appPath.split('/');
      
      // Remove page.tsx etc from the end (layout already filtered out above)
      if (['page'].includes(fileName)) {
        routeParts.pop();
      }
      
      let route = '/' + routeParts.join('/');
      if (route === '/') route = '/';
      
      return {
        route,
        type: fileName,
        isAppRouter: true,
        relativePath
      };
    }
    
    // Extract route from Next.js pages router structure
    if (relativePath.includes('/pages/') || relativePath.startsWith('pages/')) {
      const pagesPath = relativePath.includes('/pages/')
        ? relativePath.split('/pages/')[1]
        : relativePath.replace('pages/', '');
      let route = '/' + pagesPath.replace(/\.(js|jsx|ts|tsx)$/, '');
      
      // Handle index files
      if (route.endsWith('/index')) {
        route = route.replace('/index', '') || '/';
      }
      
      return {
        route,
        type: 'page',
        isAppRouter: false,
        relativePath
      };
    }

    return null;
  }

  async scanExistingRoutes() {
    console.log('🔍 Scanning existing routes...');
    
    if (!PROJECT_ID) {
      console.log('⏳ No project ID available yet, skipping initial scan');
      return;
    }

    // Check if we've already done a scan for this project
    const scanMarkerPath = path.resolve(process.cwd(), '.scan-completed');
    try {
      if (fs.existsSync(scanMarkerPath)) {
        const existingMarker = fs.readFileSync(scanMarkerPath, 'utf8').trim();
        if (existingMarker === PROJECT_ID) {
          console.log('⏭️  Initial scan already completed for this project, skipping');
          return;
        }
      }
    } catch (error) {
      // Continue with scan if marker file can't be read
      console.warn('Warning reading scan marker:', error.message);
    }

    try {
      const projectPath = getProjectPath();
      
      // Use a simple recursive file finder instead of relying on external dependencies
      const findFiles = async (dir, extensions) => {
        const results = [];
        try {
          const items = await fs.promises.readdir(dir, { withFileTypes: true });
          
          for (const item of items) {
            if (item.name.startsWith('.') || item.name === 'node_modules') {
              continue; // Skip hidden files and node_modules
            }
            
            const fullPath = path.join(dir, item.name);
            
            if (item.isDirectory()) {
              const subResults = await findFiles(fullPath, extensions);
              results.push(...subResults);
            } else if (item.isFile()) {
              const ext = path.extname(item.name);
              if (extensions.includes(ext)) {
                results.push(fullPath);
              }
            }
          }
        } catch (error) {
          // Directory might not exist or be accessible, skip it
          console.warn(`Could not scan directory ${dir}:`, error.message);
        }
        
        return results;
      };

      // Find all relevant files
      const existingFiles = await findFiles(projectPath, ['.js', '.jsx', '.ts', '.tsx']);
      
      // Filter for page components
      const pageFiles = existingFiles.filter(filePath => this.isPageComponent(filePath));
      
      console.log(`📄 Found ${pageFiles.length} existing page files`);
      
      // Process each existing page file
      for (const filePath of pageFiles) {
        console.log(`📝 Processing existing route: ${filePath}`);
        
        const routeInfo = this.extractRouteInfo(filePath);
        if (routeInfo) {
          await this.sendWebhook({
            eventType: 'scan',
            filePath,
            routeInfo,
            timestamp: Date.now()
          });
          
          // Small delay to avoid overwhelming the webhook
          await new Promise(resolve => setTimeout(resolve, 100));
        }
      }
      
      // Mark scan as completed for this project
      try {
        fs.writeFileSync(scanMarkerPath, PROJECT_ID, 'utf8');
        console.log('✅ Initial route scan completed and marked');
      } catch (error) {
        console.warn('Warning writing scan marker:', error.message);
        console.log('✅ Initial route scan completed');
      }
      
    } catch (error) {
      console.error('❌ Error scanning existing routes:', error);
    }
  }

  stop() {
    if (this.watcher) {
      this.watcher.close();
      console.log('🛑 File watcher stopped');
    }
  }
}

// Start the watcher if this script is run directly
const startWatcher = async () => {
  await initializeModules();
  
  const watcher = new FileWatcher();
  await watcher.start();

  // Handle graceful shutdown
  process.on('SIGTERM', () => {
    console.log('Received SIGTERM, shutting down gracefully...');
    watcher.stop();
    process.exit(0);
  });

  process.on('SIGINT', () => {
    console.log('Received SIGINT, shutting down gracefully...');
    watcher.stop();
    process.exit(0);
  });
};

if (require.main === module) {
  startWatcher().catch(error => {
    console.error('❌ Failed to start file watcher:', error);
    process.exit(1);
  });
}

module.exports = FileWatcher;