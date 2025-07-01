import path from 'path';
import { writeFile } from './helperF.js';

/**
 * Generates enterprise-grade activity logger with advanced features
 * @param {string} baseDir - Base directory path
 */
export const generateActivityLogger = (baseDir) => {
  try {
    writeFile(
      path.join(baseDir, 'activityLogger.js'),
      `import { addDoc, collection, query, orderBy, limit, onSnapshot } from "firebase/firestore";
import { Timestamp } from "firebase/firestore";
import { db } from "@/firebase";

let unsubscribeActivity = null;

/**
 * Activity Logger Module
 * @namespace ActivityLogger
 * @description Provides enterprise-grade activity tracking with real-time updates
 */

/**
 * Logs system activity with comprehensive context
 * @memberof ActivityLogger
 * @param {Object} activity - Activity data to log
 * @param {string} activity.type - Activity type (e.g., "USER_LOGIN", "ORDER_CREATED")
 * @param {string} activity.description - Detailed activity description
 * @param {string} [activity.entityId] - Related entity ID
 * @param {string} [activity.entityType] - Related entity type
 * @param {Object} store - Pinia store instance
 * @returns {Promise<{success: boolean, activityId?: string}>} Operation result
 * 
 * @example
 * // Log user login activity
 * await logActivity({
 *   type: 'USER_LOGIN',
 *   description: 'User logged in via email',
 *   entityType: 'User'
 * }, store);
 */
export const logActivity = async (activity, store) => {
  try {
    const userContext = store.currentUser?.value
      ? { 
          userId: store.currentUser.value.uid,
          userEmail: store.currentUser.value.email,
          userName: store.currentUser.value.displayName || store.currentUser.value.email
        } 
      : { system: true };

    const activityRef = await addDoc(collection(db, "recentActivity"), {
      ...activity,
      ...userContext,
      timestamp: Timestamp.now(),
    });

    return { success: true, activityId: activityRef.id };
  } catch (err) {
    console.error("[Activity Logger] Log error:", err);
    store.error.value = "Failed to log activity";
    return { success: false, error: err.message };
  }
};

/**
 * Initializes real-time activity listener with advanced features
 * @memberof ActivityLogger
 * @param {Object} store - Pinia store instance
 * @param {Object} [options] - Configuration options
 * @param {number} [options.limit=50] - Number of activities to fetch
 * @param {string} [options.userId] - Specific user ID to filter by
 * @param {string|string[]} [options.types] - Activity types to include
 * 
 * @example
 * // Initialize listener for current user
 * initRecentActivityListener(store, {
 *   limit: 30,
 *   types: ['USER_LOGIN', 'PROFILE_UPDATE']
 * });
 */
export const initRecentActivityListener = (store, options = {}) => {
  try {
    // Cleanup existing listener
    cleanupActivityListener();

    const { limit = 50, userId, types } = options;
    const constraints = [orderBy("timestamp", "desc"), limit(limit)];
    
    // Add user filter if specified
    if (userId) {
      constraints.push(where("userId", "==", userId));
    }
    
    // Add type filters if specified
    if (types) {
      const typeArray = Array.isArray(types) ? types : [types];
      if (typeArray.length > 0) {
        constraints.push(where("type", "in", typeArray));
      }
    }

    const q = query(collection(db, "recentActivity"), ...constraints);

    unsubscribeActivity = onSnapshot(q, 
      (snapshot) => {
        store.recentActivity.value = snapshot.docs.map(doc => {
          const data = doc.data();
          return {
            id: doc.id,
            ...data,
            // Convert Firestore Timestamp to JS Date
            timestamp: data.timestamp?.toDate() 
          };
        });
      }, 
      (error) => {
        console.error("[Activity Listener] Error:", error);
        store.error.value = "Activity feed update failed";
      }
    );

    console.debug("[Activity Logger] Listener initialized");
  } catch (error) {
    console.error("[Activity Logger] Listener setup failed:", error);
    store.error.value = "Activity listener initialization error";
  }
};

/**
 * Cleans up activity listener resources
 * @memberof ActivityLogger
 * 
 * @example
 * // Clean up when component is unmounted
 * onUnmounted(() => cleanupActivityListener());
 */
export const cleanupActivityListener = () => {
  if (unsubscribeActivity) {
    unsubscribeActivity();
    unsubscribeActivity = null;
    console.debug("[Activity Logger] Listener cleaned up");
  }
};

/**
 * Advanced activity search with pagination
 * @memberof ActivityLogger
 * @param {Object} criteria - Search criteria
 * @param {string} [criteria.userId] - User ID filter
 * @param {string|string[]} [criteria.types] - Activity types
 * @param {Date} [criteria.startDate] - Start date range
 * @param {Date} [criteria.endDate] - End date range
 * @param {number} [pageSize=25] - Results per page
 * @returns {Promise<{activities: Array, lastVisible: DocumentSnapshot}>} Search results
 */
export const searchActivities = async (criteria, pageSize = 25) => {
  try {
    const { userId, types, startDate, endDate } = criteria;
    const constraints = [orderBy("timestamp", "desc"), limit(pageSize)];
    
    if (userId) constraints.push(where("userId", "==", userId));
    
    if (types) {
      const typeArray = Array.isArray(types) ? types : [types];
      constraints.push(where("type", "in", typeArray));
    }
    
    if (startDate) {
      constraints.push(where("timestamp", ">=", Timestamp.fromDate(startDate)));
    }
    
    if (endDate) {
      constraints.push(where("timestamp", "<=", Timestamp.fromDate(endDate)));
    }
    
    const q = query(collection(db, "recentActivity"), ...constraints);
    const snapshot = await getDocs(q);
    
    return {
      activities: snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        timestamp: doc.data().timestamp?.toDate()
      })),
      lastVisible: snapshot.docs[snapshot.docs.length - 1]
    };
  } catch (error) {
    console.error("[Activity Search] Failed:", error);
    throw new Error("Activity search operation failed");
  }
};

/**
 * Export all activity logger functions
 */
export default {
  logActivity,
  initRecentActivityListener,
  cleanupActivityListener,
  searchActivities
};`
    );
  } catch (error) {
    throw new Error(`[Activity Logger] Generation failed: ${error.message}`);
  }
};