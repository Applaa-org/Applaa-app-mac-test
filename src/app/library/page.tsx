/**
 * Library Page - Disabled for MVP
 * 
 * The Prompt Library functionality has been disabled for the MVP release.
 * This page shows a simple message indicating the feature is coming soon.
 */

import React from "react";

// Disabled for MVP - Prompt Library functionality is not available
export default function LibraryPageDisabled() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] p-8">
      <div className="text-center max-w-md">
        <div className="w-16 h-16 mx-auto mb-4 bg-gray-100 rounded-full flex items-center justify-center">
          <span className="text-2xl">📚</span>
        </div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">
          Library Coming Soon
        </h2>
        <p className="text-gray-600 mb-4">
          The Prompt Library feature is currently disabled for the MVP version. 
          It will be available in a future release.
        </p>
        <p className="text-sm text-gray-500">
          For now, you can create amazing apps directly from the home page!
        </p>
      </div>
    </div>
  );
}