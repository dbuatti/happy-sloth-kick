import { useMemo } from 'react';
import { parse, getMinutes, getHours, parseISO, isValid, isSameDay, differenceInMinutes } from 'date-fns';
import { Appointment } from '@/hooks/useAppointments';

interface TimeBlock {
  start: Date;
  end: Date;
}

interface UsePositionedAppointmentsProps {
  appointments: Appointment[];
  daysInGrid: Date[];
  visibleTimeBlocks: TimeBlock[];
}

export const usePositionedAppointments = ({
  appointments,
  daysInGrid,
  visibleTimeBlocks,
}: UsePositionedAppointmentsProps) => {
  const appointmentsWithPositions = useMemo(() => {
    const positionedApps: (Appointment & { gridColumn: number; gridRowStart: number; gridRowEnd: number; trackIndex: number; totalTracks: number; })[] = [];

    daysInGrid.forEach((day, dayIndex) => {
      const appsForThisDay = appointments.filter(app => isSameDay(parseISO(app.date), day));

      const sortedApps = [...appsForThisDay].sort((a, b) => {
        const aStart = parse(a.start_time, 'HH:mm:ss', day);
        const bStart = parse(b.start_time, 'HH:mm:ss', day);
        return aStart.getTime() - bStart.getTime();
      });

      const tracks: Appointment[][] = []; // Each track holds non-overlapping appointments

      sortedApps.forEach(app => {
        const appDate = parseISO(app.date);
        const appStartTime = parse(app.start_time, 'HH:mm:ss', appDate);
        const appEndTime = parse(app.end_time, 'HH:mm:ss', appDate);

        if (!isValid(appStartTime) || !isValid(appEndTime)) {
          return; // Skip invalid appointments
        }

        const startBlockIndex = visibleTimeBlocks.findIndex(block =>
            getHours(block.start) === getHours(appStartTime) && getMinutes(block.start) === getMinutes(appStartTime)
        );

        if (startBlockIndex === -1) {
            return; // Skip if outside visible time blocks
        }

        const gridRowStart = startBlockIndex + 2; // +1 for 1-based indexing, +1 for header row
        const durationInMinutes = differenceInMinutes(appEndTime, appStartTime);
        const durationInBlocks = durationInMinutes / 30;
        const gridRowEnd = gridRowStart + durationInBlocks;

        let assignedToTrack = false;
        for (let i = 0; i < tracks.length; i++) {
          const lastAppInTrack = tracks[i][tracks[i].length - 1];
          const lastAppEndTime = parse(lastAppInTrack.end_time, 'HH:mm:ss', appDate);

          // Check if current app overlaps with the last app in this track
          // An overlap occurs if the current app starts before the last app ends
          if (appStartTime.getTime() < lastAppEndTime.getTime()) {
            continue; // Overlaps, try next track
          } else {
            // No overlap, assign to this track
            tracks[i].push(app);
            positionedApps.push({
              ...app,
              gridColumn: dayIndex + 2,
              gridRowStart,
              gridRowEnd,
              trackIndex: i,
              totalTracks: 0, // Will be updated later
            });
            assignedToTrack = true;
            break;
          }
        }

        if (!assignedToTrack) {
          // No suitable track found, create a new one
          tracks.push([app]);
          positionedApps.push({
            ...app,
            gridColumn: dayIndex + 2,
            gridRowStart,
            gridRowEnd,
            trackIndex: tracks.length - 1,
            totalTracks: 0, // Will be updated later
          });
        }
      });

      // After all apps for the day are assigned to tracks, update totalTracks
      const maxTracksForDay = tracks.length;
      positionedApps.filter(app => isSameDay(parseISO(app.date), day)).forEach(app => {
        app.totalTracks = maxTracksForDay;
      });
    });
    return positionedApps;
  }, [appointments, daysInGrid, visibleTimeBlocks]);

  return { appointmentsWithPositions };
};