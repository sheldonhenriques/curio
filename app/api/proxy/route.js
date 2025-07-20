import { NextResponse } from 'next/server'

/**
 * Proxy endpoint to serve external content through same origin
 * This eliminates CORS issues for iframe access
 */
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url)
    const targetUrl = searchParams.get('url')
    
    if (!targetUrl) {
      return NextResponse.json({ error: 'URL parameter is required' }, { status: 400 })
    }

    console.log('[Proxy] Fetching:', targetUrl)

    // Fetch the target content
    const response = await fetch(targetUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; Curio Inspector)',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8'
      }
    })

    if (!response.ok) {
      return NextResponse.json({ 
        error: `Failed to fetch: ${response.status} ${response.statusText}` 
      }, { status: response.status })
    }

    let content = await response.text()
    const contentType = response.headers.get('content-type') || 'text/html'

    // If it's HTML, inject inspector receiver script
    if (contentType.includes('text/html')) {
      content = injectInspectorReceiver(content, targetUrl)
    }

    // Create response with same content type but allow cross-origin access
    const proxyResponse = new NextResponse(content, {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'X-Frame-Options': 'SAMEORIGIN',
        'X-Original-URL': targetUrl
      }
    })

    return proxyResponse

  } catch (error) {
    console.error('[Proxy] Error:', error)
    return NextResponse.json({ 
      error: `Proxy error: ${error.message}` 
    }, { status: 500 })
  }
}

/**
 * Inject inspector receiver script into HTML
 */
function injectInspectorReceiver(html, originalUrl) {
  // Add base tag to handle relative URLs
  const baseTag = `<base href="${new URL(originalUrl).origin}/">`
  
  // Inspector receiver script
  const inspectorScript = `
    <script id="curio-inspector-receiver">
      console.log('[Inspector Receiver] Loaded for:', '${originalUrl}');
      
      // Make iframe accessible to parent
      window.__CURIO_INSPECTOR_READY__ = true;
      
      // Notify parent that content is ready
      if (window.parent !== window) {
        window.parent.postMessage({
          type: 'IFRAME_CONTENT_READY',
          url: '${originalUrl}',
          timestamp: Date.now()
        }, '*');
      }
      
      // Add inspector styles
      const style = document.createElement('style');
      style.id = 'curio-inspector-styles';
      style.textContent = \`
        .curio-inspector-highlight {
          outline: 2px solid #ff0000 !important;
          outline-offset: 1px !important;
          background: rgba(255, 0, 0, 0.1) !important;
        }
        .curio-inspector-selected {
          outline: 3px solid #0066ff !important;
          outline-offset: 2px !important;
          background: rgba(0, 102, 255, 0.1) !important;
        }
      \`;
      document.head.appendChild(style);
    </script>
  `

  // Try to inject after <head> tag
  if (html.includes('<head>')) {
    return html.replace('<head>', `<head>${baseTag}${inspectorScript}`)
  }
  
  // Fallback: inject at beginning of body
  if (html.includes('<body>')) {
    return html.replace('<body>', `<body>${baseTag}${inspectorScript}`)
  }
  
  // Last resort: prepend to HTML
  return `${baseTag}${inspectorScript}${html}`
}