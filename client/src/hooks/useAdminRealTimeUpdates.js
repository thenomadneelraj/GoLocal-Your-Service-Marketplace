/**
 * Custom hook for handling real-time updates in admin components
 * Provides efficient item-level updates instead of full list reloads
 */

import { useCallback, useRef } from "react";
import { toast } from "sonner";

/**
 * Hook for managing real-time updates with optimistic UI updates
 * @param {Object} options - Configuration options
 * @param {Function} options.setItems - Function to set items state
 * @param {Function} options.setSummary - Function to set summary state (optional)
 * @param {Function} options.loadItems - Function to load items from API
 * @param {Function} options.getItemId - Function to get unique ID from item
 * @param {Function} options.updateItem - Function to update a single item in API
 */
export function useAdminRealTimeUpdates({
  setItems,
  setSummary,
  loadItems,
  getItemId,
  updateItem,
}) {
  const itemsRef = useRef([]);
  itemsRef.current = itemsRef.current || [];

  // Store the latest setters
  const setItemsRef = useRef(setItems);
  setItemsRef.current = setItems;

  const setSummaryRef = useRef(setSummary);
  setSummaryRef.current = setSummary;

  /**
   * Update a specific item in the list
   */
  const updateItemInList = useCallback((itemId, updates) => {
    setItemsRef.current((prevItems) =>
      prevItems.map((item) =>
        getItemId(item) === itemId ? { ...item, ...updates } : item
      )
    );
  }, [getItemId]);

  /**
   * Add a new item to the list
   */
  const addItemToList = useCallback((newItem) => {
    setItemsRef.current((prevItems) => [newItem, ...prevItems]);
    
    // Update summary counts if available
    if (setSummaryRef.current) {
      setSummaryRef.current((prev) => {
        if (!prev) return prev;
        const updates = {};
        
        // Increment total count
        if (prev.totalItems !== undefined) {
          updates.totalItems = prev.totalItems + 1;
        }
        if (prev.totalBookings !== undefined) {
          updates.totalBookings = prev.totalBookings + 1;
        }
        if (prev.totalUsers !== undefined) {
          updates.totalUsers = prev.totalUsers + 1;
        }
        
        // Update status-specific counts
        const status = newItem.status || newItem.approvalStatus;
        if (status) {
          if (prev.pendingRequests !== undefined && status === 'pending') {
            updates.pendingRequests = (prev.pendingRequests || 0) + 1;
          }
          if (prev.pendingApproval !== undefined && status === 'pending') {
            updates.pendingApproval = (prev.pendingApproval || 0) + 1;
          }
          if (prev.open !== undefined && status === 'open') {
            updates.open = (prev.open || 0) + 1;
          }
        }
        
        return { ...prev, ...updates };
      });
    }
  }, []);

  /**
   * Remove an item from the list
   */
  const removeItemFromList = useCallback((itemId) => {
    const item = itemsRef.current.find(item => getItemId(item) === itemId);
    
    setItemsRef.current((prevItems) =>
      prevItems.filter((item) => getItemId(item) !== itemId)
    );
    
    // Update summary counts if available
    if (setSummaryRef.current && item) {
      setSummaryRef.current((prev) => {
        if (!prev) return prev;
        const updates = {};
        
        // Decrement total count
        if (prev.totalItems !== undefined) {
          updates.totalItems = Math.max(0, prev.totalItems - 1);
        }
        if (prev.totalBookings !== undefined) {
          updates.totalBookings = Math.max(0, prev.totalBookings - 1);
        }
        if (prev.totalUsers !== undefined) {
          updates.totalUsers = Math.max(0, prev.totalUsers - 1);
        }
        
        // Update status-specific counts
        const status = item.status || item.approvalStatus;
        if (status) {
          if (prev.pendingRequests !== undefined && status === 'pending') {
            updates.pendingRequests = Math.max(0, (prev.pendingRequests || 0) - 1);
          }
          if (prev.pendingApproval !== undefined && status === 'pending') {
            updates.pendingApproval = Math.max(0, (prev.pendingApproval || 0) - 1);
          }
          if (prev.open !== undefined && status === 'open') {
            updates.open = Math.max(0, (prev.open || 0) - 1);
          }
        }
        
        return { ...prev, ...updates };
      });
    }
  }, [getItemId]);

  /**
   * Handle item created event
   */
  const handleItemCreated = useCallback((payload) => {
    console.log("[useAdminRealTimeUpdates] Item created:", payload);
    
    const newItem = payload.item || payload.data || payload;
    if (newItem) {
      addItemToList(newItem);
      toast.success("New item received");
    }
  }, [addItemToList]);

  /**
   * Handle item updated event
   */
  const handleItemUpdated = useCallback((payload) => {
    console.log("[useAdminRealTimeUpdates] Item updated:", payload);
    
    const updatedItem = payload.item || payload.data || payload;
    const itemId = payload.itemId || getItemId(updatedItem);
    
    if (itemId) {
      updateItemInList(itemId, updatedItem);
    } else {
      // Fallback to full reload if we can't identify the item
      loadItems();
    }
  }, [getItemId, updateItemInList, loadItems]);

  /**
   * Handle item deleted event
   */
  const handleItemDeleted = useCallback((payload) => {
    console.log("[useAdminRealTimeUpdates] Item deleted:", payload);
    
    const itemId = payload.itemId || payload.id;
    if (itemId) {
      removeItemFromList(itemId);
      toast.success("Item removed");
    } else {
      // Fallback to full reload if we can't identify the item
      loadItems();
    }
  }, [removeItemFromList, loadItems]);

  /**
   * Handle status change event
   */
  const handleStatusChange = useCallback((payload) => {
    console.log("[useAdminRealTimeUpdates] Status changed:", payload);
    
    const itemId = payload.itemId || payload.id;
    const newStatus = payload.status;
    
    if (itemId && newStatus !== undefined) {
      updateItemInList(itemId, { status: newStatus });
      
      // Update summary counts
      if (setSummaryRef.current) {
        setSummaryRef.current((prev) => {
          if (!prev) return prev;
          
          // This is a simplified update - in a real scenario, we'd need to know
          // the previous status to properly update counts
          return prev;
        });
      }
    } else {
      loadItems();
    }
  }, [updateItemInList, loadItems]);

  /**
   * Refresh all data (full reload)
   */
  const refreshAll = useCallback(() => {
    loadItems();
  }, [loadItems]);

  return {
    updateItemInList,
    addItemToList,
    removeItemFromList,
    handleItemCreated,
    handleItemUpdated,
    handleItemDeleted,
    handleStatusChange,
    refreshAll,
  };
}

/**
 * Simplified hook for basic real-time updates
 * Just provides a callback that triggers a reload with optional toast
 */
export function useSimpleRealTimeUpdate(loadItems, dependencies = []) {
  return useCallback((payload) => {
    console.log("[useSimpleRealTimeUpdate] Received update:", payload);
    
    // Reload data
    loadItems();
    
    // Show toast if message provided
    if (payload.message) {
      toast.success(payload.message);
    }
  }, dependencies); // eslint-disable-line react-hooks/exhaustive-deps
}

export default useAdminRealTimeUpdates;