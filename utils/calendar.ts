import * as Calendar from 'expo-calendar';

export interface CalendarEvent {
  title: string;
  startDate: Date;
  endDate: Date;
  notes?: string;
  location?: string;
  alarms?: Calendar.Alarm[];
}

export async function requestCalendarPermissions(): Promise<boolean> {
  const { status } = await Calendar.requestCalendarPermissionsAsync();
  return status === 'granted';
}

export async function getDefaultCalendar(): Promise<string | null> {
  try {
    const calendars = await Calendar.getCalendarsAsync(Calendar.EntityTypes.EVENT);
    const defaultCalendar = calendars.find(cal => cal.isPrimary);
    return defaultCalendar?.id || calendars[0]?.id || null;
  } catch (error) {
    console.error('Error getting default calendar:', error);
    return null;
  }
}

export async function createCalendarEvent(event: CalendarEvent): Promise<string | null> {
  try {
    const hasPermission = await requestCalendarPermissions();
    if (!hasPermission) {
      throw new Error('Calendar permission not granted');
    }

    const calendarId = await getDefaultCalendar();
    if (!calendarId) {
      throw new Error('No calendar found');
    }

    const eventId = await Calendar.createEventAsync(calendarId, {
      title: event.title,
      startDate: event.startDate,
      endDate: event.endDate,
      notes: event.notes,
      location: event.location,
      alarms: event.alarms || [
        { relativeOffset: -24 * 60 }, // 1 day before
        { relativeOffset: -7 * 24 * 60 }, // 1 week before
      ],
      timeZone: 'UTC',
    });

    return eventId;
  } catch (error) {
    console.error('Error creating calendar event:', error);
    return null;
  }
}

export async function deleteCalendarEvent(eventId: string): Promise<boolean> {
  try {
    const hasPermission = await requestCalendarPermissions();
    if (!hasPermission) {
      throw new Error('Calendar permission not granted');
    }

    await Calendar.deleteEventAsync(eventId);
    return true;
  } catch (error) {
    console.error('Error deleting calendar event:', error);
    return false;
  }
}

export async function updateCalendarEvent(eventId: string, event: CalendarEvent): Promise<boolean> {
  try {
    const hasPermission = await requestCalendarPermissions();
    if (!hasPermission) {
      throw new Error('Calendar permission not granted');
    }

    const calendarId = await getDefaultCalendar();
    if (!calendarId) {
      throw new Error('No calendar found');
    }

    await Calendar.updateEventAsync(eventId, {
      title: event.title,
      startDate: event.startDate,
      endDate: event.endDate,
      notes: event.notes,
      location: event.location,
      alarms: event.alarms || [
        { relativeOffset: -24 * 60 }, // 1 day before
        { relativeOffset: -7 * 24 * 60 }, // 1 week before
      ],
      timeZone: 'UTC',
    });

    return true;
  } catch (error) {
    console.error('Error updating calendar event:', error);
    return false;
  }
} 