/**
 * Formats a date/timestamp into a user-friendly display format
 * @param {string|Date} dateInput - The date to format (ISO string, timestamp, or Date object)
 * @returns {string} Formatted date string
 */
export function formatUpdatedAt(dateInput) {
  if (!dateInput) return 'just now';
  
  try {
    const date = new Date(dateInput);
    
    // Check if date is valid
    if (isNaN(date.getTime())) {
      return 'just now';
    }
    
    const now = new Date();
    const diffInMs = now - date;
    const diffInMinutes = Math.floor(diffInMs / (1000 * 60));
    const diffInHours = Math.floor(diffInMs / (1000 * 60 * 60));
    const diffInDays = Math.floor(diffInMs / (1000 * 60 * 60 * 24));
    
    // Less than 1 minute
    if (diffInMinutes < 1) {
      return 'just now';
    }
    
    // Less than 1 hour
    if (diffInMinutes < 60) {
      return `${diffInMinutes} ${diffInMinutes === 1 ? 'minute' : 'minutes'} ago`;
    }
    
    // Less than 24 hours
    if (diffInHours < 24) {
      return `${diffInHours} ${diffInHours === 1 ? 'hour' : 'hours'} ago`;
    }
    
    // Less than 7 days
    if (diffInDays < 7) {
      return `${diffInDays} ${diffInDays === 1 ? 'day' : 'days'} ago`;
    }
    
    // More than 7 days - show formatted date
    const isThisYear = date.getFullYear() === now.getFullYear();
    
    if (isThisYear) {
      // Same year: "Dec 15 at 2:30 PM"
      return date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit'
      });
    } else {
      // Different year: "Dec 15, 2023"
      return date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric'
      });
    }
  } catch (error) {
    console.error('Error formatting date:', error);
    return 'just now';
  }
}