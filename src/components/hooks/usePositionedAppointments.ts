import { useMemo } from 'react';
import { parseISO, isSameDay, getHours, getMinutes } from 'date-fns'; // Removed format, addMinutes, isBefore, setHours, setMinutes
import { Appointment } from '@/hooks/useAppointments';

interface TimeBlock {
  start: Date;
  end: Date;
}

interface PositionedAppointment extends Appointment {
  top: number;
  height: number;
  column: number;
  columnsInGroup: number;
  trackIndex: number;
  totalTracks: number;
}

interface UsePositionedAppointmentsProps {
  appointments: Appointment[];
  daysInGrid: Date[];
  visibleTimeBlocks: TimeBlock[];
}

const rowHeight = 50; // Must match ScheduleGridContent

export const usePositionedAppointments = ({
  appointments,
  daysInGrid,
  visibleTimeBlocks,
}: UsePositionedAppointmentsProps) => {
  const appointmentsWithPositions = useMemo(() => {
    const positioned: PositionedAppointment[] = [];
    const minHour = getHours(visibleTimeBlocks[0]?.start || new Date());
    const minMinute = getMinutes(visibleTimeBlocks[0]?.start || new Date());

    daysInGrid.forEach((day, dayIndex) => {
      const dayAppointments = appointments.filter(app =>
        isSameDay(parseISO(app.date), day)
      ).sort((a, b) => {
        const startA = parseISO(`2000-01-01T${a.start_time}`);
        const startB = parseISO(`2000-01-01T${b.start_time}`);
        return startA.getTime() - startB.getTime();
      });

      const columns: PositionedAppointment[][] = [];

      dayAppointments.forEach(app => {
        const appStart = parseISO(`2000-01-01T${app.start_time}`);
        const appEnd = parseISO(`2000-01-01T${app.end_time}`);

        const startMinutes = getHours(appStart) * 60 + getMinutes(appStart);
        const endMinutes = getHours(appEnd) * 60 + getMinutes(appEnd);
        const gridStartMinutes = minHour * 60 + minMinute;

        const top = ((startMinutes - gridStartMinutes) / 30) * rowHeight;
        const height = ((endMinutes - startMinutes) / 30) * rowHeight;

        let placed = false;
        for (let i = 0; i < columns.length; i++) {
          const column = columns[i];
          const overlaps = column.some(existingApp => {
            const existingStart = parseISO(`2000-01-01T${existingApp.start_time}`);
            const existingEnd = parseISO(`2000-01-01T${existingApp.end_time}`);
            return (appStart < existingEnd && appEnd > existingStart);
          });

          if (!overlaps) {
            column.push({ ...app, top, height, column: dayIndex + 2, trackIndex: i, totalTracks: 1 });
            placed = true;
            break;
          }
        }

        if (!placed) {
          columns.push([{ ...app, top, height, column: dayIndex + 2, trackIndex: columns.length, totalTracks: 1 }]);
        }
      });

      // Update totalTracks for all appointments in overlapping groups
      columns.forEach(column => {
        column.forEach(app => {
          app.totalTracks = columns.length;
        });
        positioned.push(...column);
      });
    });

    return positioned;
  }, [appointments, daysInGrid, visibleTimeBlocks]);

  return { appointmentsWithPositions };
};