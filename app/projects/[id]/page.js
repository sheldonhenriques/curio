'use client';

import { Sidebar } from '@/components/layout/Sidebar';
import Canvas from '@/components/flow/Canvas';
import { Button } from '@/components/ui/Button';

export default function ProductPage() {
  return (
    <div className="min-h-screen bg-white dark:bg-black">
      <Sidebar />
      
      {/* Main content area */}
      <div className="ml-16 transition-all duration-300 px-6 py-4 flex flex-col h-screen">
        
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-gray-700">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Projects Name Here</h1>
          <div className="flex gap-2">
            <Button className="flex items-center gap-2 px-4 py-2 rounded-lg 
             bg-black-600 text-white hover:bg-black-700 
             dark:bg-white dark:text-black dark:hover:bg-gray-200">
              Details
            </Button>
            <Button className="flex items-center gap-2 px-4 py-2 rounded-lg 
             bg-black-600 text-white hover:bg-black-700 
             dark:bg-white dark:text-black dark:hover:bg-gray-200">
              Share
            </Button>
            <Button className="flex items-center gap-2 px-4 py-2 rounded-lg 
             bg-black-600 text-white hover:bg-black-700 
             dark:bg-white dark:text-black dark:hover:bg-gray-200">
              Add Card
            </Button>
            <Button className="flex items-center gap-2 px-4 py-2 rounded-lg 
             bg-black-600 text-white hover:bg-black-700 
             dark:bg-white dark:text-black dark:hover:bg-gray-200">
              Arrange Cards
            </Button>
          </div>
        </div>

        {/* Canvas */}
        <div className="flex-1 relative overflow-hidden">
          <Canvas />
        </div>
      </div>
    </div>
  );
}
