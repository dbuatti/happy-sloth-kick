import React from 'react';

/**
 * Tracks in-flight updates to prevent real-time listeners from reacting to self-initiated changes.
 * @param id The ID of the item being updated or a unique string for a bulk operation.
 * @param inFlightUpdatesRef A ref to a Set containing IDs of currently in-flight updates.
 * @returns A cleanup function to be called in the `finally` block of the mutation.
 */
export const trackInFlight = (id: string, inFlightUpdatesRef: React.MutableRefObject<Set<string>>) => {
  inFlightUpdatesRef.current.add(id);
  return () => {
    inFlightUpdatesRef.current.delete(id);
  };
};