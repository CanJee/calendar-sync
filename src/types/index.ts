export type CalendarSource =
  | "hasan_work"
  | "hasan_personal"
  | "lails_sunnybrook"
  | "lails_personal";

export type Owner = "hasan" | "lails" | "shared";

export type ActivityType =
  | "food"
  | "tennis"
  | "pickleball"
  | "coffee"
  | "drinks"
  | "social"
  | "other";

export const ACTIVITY_LABELS: Record<ActivityType, string> = {
  food: "Food / Dining",
  tennis: "Tennis",
  pickleball: "Pickleball",
  coffee: "Coffee",
  drinks: "Drinks",
  social: "Hang out",
  other: "Other",
};

export const ACTIVITY_DURATIONS: Record<ActivityType, number> = {
  food: 120,
  tennis: 150,
  pickleball: 120,
  coffee: 60,
  drinks: 90,
  social: 120,
  other: 60,
};

export type RsvpStatus =
  | "accepted"
  | "declined"
  | "tentative"
  | "needsAction"
  | "unknown";

export interface CalendarEvent {
  id: string;
  title: string;
  start: Date;
  end: Date;
  source: CalendarSource;
  owner: Owner;
  rsvpStatus: RsvpStatus;
  isAllDay: boolean;
  location?: string;
  description?: string;
}

export type SlotStatus = "free" | "busy" | "driver_duty";

export interface AvailabilitySlot {
  start: Date;
  end: Date;
  status: SlotStatus;
  isBookable: boolean;
  bookingCount: number; // how many bookings already in this slot
}

export type BookingStatus = "pending" | "approved" | "rejected";

export interface Booking {
  id: string;
  title: string;
  activityType: ActivityType;
  start: Date;
  end: Date;
  durationHours: number;
  bookedByName: string;
  bookedByEmail?: string;
  note?: string;
  status: BookingStatus;
  secretToken: string;
  approvalToken: string;
  respondedAt?: Date;
  createdAt: Date;
}

// API response shapes
export interface AvailabilityResponse {
  slots: AvailabilitySlot[];
  generatedAt: string;
}

export interface BookingResponse {
  booking: Booking;
  managementToken: string;
}
