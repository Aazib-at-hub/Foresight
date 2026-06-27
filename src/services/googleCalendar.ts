import { auth, GoogleAuthProvider, signInWithPopup } from "../firebase";

let cachedAccessToken: string | null = typeof window !== "undefined" ? localStorage.getItem("gcal_access_token") : null;

export const setCachedToken = (token: string | null) => {
  cachedAccessToken = token;
  if (typeof window !== "undefined") {
    if (token) {
      localStorage.setItem("gcal_access_token", token);
    } else {
      localStorage.removeItem("gcal_access_token");
    }
  }
};

export const getCachedToken = (): string | null => {
  if (!cachedAccessToken && typeof window !== "undefined") {
    cachedAccessToken = localStorage.getItem("gcal_access_token");
  }
  return cachedAccessToken;
};

// Sign in and request Google Calendar scopes
export const connectGoogleCalendar = async (): Promise<string> => {
  const provider = new GoogleAuthProvider();
  provider.addScope("https://www.googleapis.com/auth/calendar");
  provider.addScope("https://www.googleapis.com/auth/calendar.events");
  
  const result = await signInWithPopup(auth, provider);
  const credential = GoogleAuthProvider.credentialFromResult(result);
  
  if (!credential?.accessToken) {
    throw new Error("Failed to retrieve Google OAuth access token.");
  }
  
  setCachedToken(credential.accessToken);
  return credential.accessToken;
};

export interface GoogleCalendarEvent {
  id: string;
  summary: string;
  description?: string;
  start: {
    dateTime?: string;
    date?: string;
  };
  end: {
    dateTime?: string;
    date?: string;
  };
}

// Fetch calendar events
export const fetchGoogleEvents = async (timeMin: string, timeMax: string): Promise<GoogleCalendarEvent[]> => {
  const token = getCachedToken();
  if (!token) {
    throw new Error("No Google Calendar access token. Please connect first.");
  }
  
  const url = `https://www.googleapis.com/calendar/v3/calendars/primary/events?timeMin=${encodeURIComponent(
    timeMin
  )}&timeMax=${encodeURIComponent(timeMax)}&singleEvents=true&orderBy=startTime`;
  
  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
  
  if (!response.ok) {
    if (response.status === 401) {
      cachedAccessToken = null; // Token expired
      throw new Error("Authentication expired. Please reconnect Google Calendar.");
    }
    const errData = await response.json().catch(() => ({}));
    throw new Error(errData.error?.message || "Failed to fetch Google Calendar events.");
  }
  
  const data = await response.json();
  return data.items || [];
};

// Create an event
export const createGoogleEvent = async (event: {
  summary: string;
  description: string;
  startDateTime: string;
  endDateTime: string;
}): Promise<GoogleCalendarEvent> => {
  const token = getCachedToken();
  if (!token) {
    throw new Error("No Google Calendar access token. Please connect first.");
  }
  
  const body = {
    summary: event.summary,
    description: event.description,
    start: {
      dateTime: event.startDateTime,
    },
    end: {
      dateTime: event.endDateTime,
    },
  };
  
  const response = await fetch("https://www.googleapis.com/calendar/v3/calendars/primary/events", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });
  
  if (!response.ok) {
    if (response.status === 401) {
      cachedAccessToken = null;
      throw new Error("Authentication expired. Please reconnect Google Calendar.");
    }
    const errData = await response.json().catch(() => ({}));
    throw new Error(errData.error?.message || "Failed to create Google Calendar event.");
  }
  
  return await response.json();
};
