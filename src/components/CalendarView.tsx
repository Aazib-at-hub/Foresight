import React, { useState, useEffect } from "react";
import { Commitment } from "../types";
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, Clock, AlertTriangle, PlusCircle } from "lucide-react";
import { getCachedToken, connectGoogleCalendar, fetchGoogleEvents, setCachedToken, GoogleCalendarEvent } from "../services/googleCalendar";

interface CalendarViewProps {
  commitments: Commitment[];
  selectedCommitmentId: string | null;
  onSelectCommitment: (id: string) => void;
  onQuickAddForDate?: (dateStr: string) => void;
}

export default function CalendarView({
  commitments,
  selectedCommitmentId,
  onSelectCommitment,
  onQuickAddForDate,
}: CalendarViewProps) {
  const [currentDate, setCurrentDate] = useState(new Date());

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const monthNames = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ];

  const daysOfWeek = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

  // Google Calendar Integration state
  const [googleEvents, setGoogleEvents] = useState<GoogleCalendarEvent[]>([]);
  const [loadingGoogle, setLoadingGoogle] = useState(false);
  const [googleError, setGoogleError] = useState<string | null>(null);
  const [isGoogleConnected, setIsGoogleConnected] = useState(!!getCachedToken());

  // Fetch Google Calendar events for the month
  useEffect(() => {
    if (!isGoogleConnected) {
      setGoogleEvents([]);
      return;
    }

    const fetchEventsForMonth = async () => {
      setLoadingGoogle(true);
      setGoogleError(null);
      try {
        const firstDayOfMonth = new Date(year, month, 1);
        const lastDayOfMonth = new Date(year, month + 1, 0);
        
        const timeMin = new Date(firstDayOfMonth.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();
        const timeMax = new Date(lastDayOfMonth.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString();
        
        const events = await fetchGoogleEvents(timeMin, timeMax);
        setGoogleEvents(events);
      } catch (err: any) {
        console.error("Error loading Google Calendar events:", err);
        setGoogleError(err.message || "Failed to load Google Calendar events.");
        if (err.message?.includes("expired") || err.message?.includes("token") || err.message?.includes("connect")) {
          setIsGoogleConnected(false);
        }
      } finally {
        setLoadingGoogle(false);
      }
    };

    fetchEventsForMonth();
  }, [currentDate, isGoogleConnected, year, month]);

  const handleConnectGoogle = async () => {
    try {
      setLoadingGoogle(true);
      await connectGoogleCalendar();
      setIsGoogleConnected(true);
    } catch (err: any) {
      console.error(err);
      setGoogleError(err.message || "Failed to connect Google Calendar.");
    } finally {
      setLoadingGoogle(false);
    }
  };

  const handleDisconnectGoogle = () => {
    setCachedToken(null);
    setIsGoogleConnected(false);
    setGoogleEvents([]);
  };

  // Get first day of the month
  const firstDayIndex = new Date(year, month, 1).getDay();

  // Get total days in the current month
  const totalDays = new Date(year, month + 1, 0).getDate();

  // Get total days in the previous month (for leading dates)
  const prevMonthTotalDays = new Date(year, month, 0).getDate();

  const handlePrevMonth = () => {
    setCurrentDate(new Date(year, month - 1, 1));
  };

  const handleNextMonth = () => {
    setCurrentDate(new Date(year, month + 1, 1));
  };

  const handleToday = () => {
    setCurrentDate(new Date());
  };

  // Build the calendar matrix
  const days: { dayNumber: number; isCurrentMonth: boolean; dateString: string }[] = [];

  // Previous month padding days
  for (let i = firstDayIndex - 1; i >= 0; i--) {
    const d = prevMonthTotalDays - i;
    const prevMonthStr = month === 0 ? 11 : month - 1;
    const prevYearStr = month === 0 ? year - 1 : year;
    const dateString = `${prevYearStr}-${String(prevMonthStr + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
    days.push({ dayNumber: d, isCurrentMonth: false, dateString });
  }

  // Current month days
  for (let d = 1; d <= totalDays; d++) {
    const dateString = `${year}-${String(month + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
    days.push({ dayNumber: d, isCurrentMonth: true, dateString });
  }

  // Next month padding days to fill 6-row grid (42 cells)
  const totalCells = 42;
  const nextMonthPadding = totalCells - days.length;
  for (let d = 1; d <= nextMonthPadding; d++) {
    const nextMonthStr = month === 11 ? 0 : month + 1;
    const nextYearStr = month === 11 ? year + 1 : year;
    const dateString = `${nextYearStr}-${String(nextMonthStr + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
    days.push({ dayNumber: d, isCurrentMonth: false, dateString });
  }

  const getPriorityColors = (priority: string) => {
    switch (priority) {
      case "High":
        return {
          bg: "bg-rose-50 border-rose-200 text-rose-700 hover:bg-rose-100/80",
          indicator: "bg-rose-500",
        };
      case "Medium":
        return {
          bg: "bg-amber-50 border-amber-200 text-amber-800 hover:bg-amber-100/80",
          indicator: "bg-amber-500",
        };
      case "Low":
      default:
        return {
          bg: "bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100/80",
          indicator: "bg-slate-400",
        };
    }
  };

  const getCommitmentsForDate = (dateString: string) => {
    return commitments.filter((c) => {
      // Direct comparison of deadline splits
      if (!c.deadline) return false;
      const cDate = c.deadline.split("T")[0];
      return cDate === dateString;
    });
  };

  const getGoogleEventsForDate = (dateString: string) => {
    return googleEvents.filter((ev) => {
      const start = ev.start.dateTime || ev.start.date;
      if (!start) return false;
      return start.split("T")[0] === dateString;
    });
  };

  const isToday = (dateString: string) => {
    const todayStr = new Date().toISOString().split("T")[0];
    return dateString === todayStr;
  };

  return (
    <div className="border border-[#1A1A1A]/10 bg-white p-5 rounded-none space-y-4">
      {/* Google Calendar sync bar */}
      {!isGoogleConnected ? (
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between p-3.5 bg-slate-50 border border-slate-200/60 gap-3">
          <div className="space-y-1">
            <h3 className="text-xs font-serif italic text-slate-800 font-medium flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-slate-400" /> Google Calendar Connection
            </h3>
            <p className="text-[10px] text-slate-500 leading-normal max-w-xl">
              Connect your Google Calendar to synchronize external events and overlay your schedule availability directly onto your active obligations ledger.
            </p>
          </div>
          <button
            onClick={handleConnectGoogle}
            className="shrink-0 px-3.5 py-2 bg-[#1A1A1A] hover:bg-black text-[#F4F1EE] font-bold text-[9px] uppercase tracking-widest transition-all cursor-pointer flex items-center justify-center gap-2"
          >
            <svg className="w-3 h-3 fill-current" viewBox="0 0 24 24">
              <path d="M12.24 10.285V14.4h6.887c-.648 2.41-2.519 4.114-5.136 4.114-3.55 0-6.44-2.89-6.44-6.44s2.89-6.44 6.44-6.44c1.63 0 3.117.61 4.267 1.72l3.22-3.22C19.58 2.378 16.14 1 12.24 1 6.13 1 1 6.13 1 12.24s5.13 11.24 11.24 11.24c5.8 0 10.74-4.14 10.74-11.24 0-.68-.06-1.34-.18-1.955H12.24z"/>
            </svg>
            Connect Calendar
          </button>
        </div>
      ) : (
        <div className="flex items-center justify-between p-3 border border-emerald-200 bg-emerald-50/30 text-xs">
          <div className="flex items-center gap-2">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
            <span className="font-mono text-[10px] uppercase font-bold text-emerald-800 tracking-wider">
              Google Calendar Synced
            </span>
            {loadingGoogle && <span className="text-[9px] font-mono text-gray-400 animate-pulse">(fetching events...)</span>}
            {googleError && <span className="text-[9px] font-mono text-rose-500">Error: {googleError}</span>}
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleDisconnectGoogle}
              className="text-[9px] font-mono uppercase tracking-wider text-rose-700 hover:text-rose-950 underline cursor-pointer"
            >
              Disconnect
            </button>
          </div>
        </div>
      )}

      {/* Calendar Header Controls */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <CalendarIcon className="w-4 h-4 opacity-75" />
          <h2 className="text-sm font-bold tracking-wider font-mono text-[#1A1A1A] uppercase">
            {monthNames[month]} {year}
          </h2>
        </div>
        <div className="flex items-center gap-1.5">
          <button
            onClick={handleToday}
            className="px-2.5 py-1 text-[9px] font-mono font-bold uppercase border border-[#1A1A1A]/20 hover:bg-[#1A1A1A]/5 text-[#1A1A1A] transition-all cursor-pointer"
          >
            Today
          </button>
          <button
            onClick={handlePrevMonth}
            className="p-1 border border-[#1A1A1A]/20 hover:bg-[#1A1A1A]/5 text-[#1A1A1A] transition-all cursor-pointer"
          >
            <ChevronLeft className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={handleNextMonth}
            className="p-1 border border-[#1A1A1A]/20 hover:bg-[#1A1A1A]/5 text-[#1A1A1A] transition-all cursor-pointer"
          >
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Days of Week Header */}
      <div className="grid grid-cols-7 gap-1 border-b border-[#1A1A1A]/10 pb-2">
        {daysOfWeek.map((day) => (
          <div key={day} className="text-center">
            <span className="text-[9px] font-bold font-mono text-gray-400 uppercase tracking-widest block">
              {day}
            </span>
          </div>
        ))}
      </div>

      {/* Days Matrix */}
      <div className="grid grid-cols-7 gap-1.5">
        {days.map(({ dayNumber, isCurrentMonth, dateString }, idx) => {
          const dateCommitments = getCommitmentsForDate(dateString);
          const activeDateCommitments = dateCommitments.filter((c) => c.status === "Active");
          const todayMarker = isToday(dateString);

          return (
            <div
              key={idx}
              className={`min-h-[85px] border p-1.5 flex flex-col justify-between transition-all group relative ${
                isCurrentMonth ? "bg-white border-[#1A1A1A]/5" : "bg-[#F4F1EE]/30 border-[#1A1A1A]/5 opacity-60"
              } ${todayMarker ? "ring-1 ring-indigo-600 border-indigo-600" : ""}`}
            >
              {/* Day Number and Action Banner */}
              <div className="flex justify-between items-center mb-1">
                <span
                  className={`text-[10px] font-mono font-bold ${
                    todayMarker
                      ? "bg-indigo-600 text-white w-4.5 h-4.5 flex items-center justify-center rounded-sm"
                      : "text-[#1A1A1A]"
                  }`}
                >
                  {dayNumber}
                </span>

                {/* Quick Add Action */}
                {onQuickAddForDate && (
                  <button
                    onClick={() => onQuickAddForDate(dateString)}
                    className="opacity-0 group-hover:opacity-100 text-indigo-600 hover:text-indigo-800 transition-opacity p-0.5"
                    title={`Create obligation for ${dateString}`}
                  >
                    <PlusCircle className="w-3 h-3" />
                  </button>
                )}
              </div>

              {/* Commitments due today */}
              <div className="flex-1 space-y-1 overflow-y-auto max-h-[60px] scrollbar-none">
                {activeDateCommitments.map((commitment) => {
                  const colors = getPriorityColors(commitment.priority);
                  const isSelected = selectedCommitmentId === commitment.id;

                  return (
                    <div
                      key={commitment.id}
                      onClick={(e) => {
                        e.stopPropagation();
                        onSelectCommitment(commitment.id);
                      }}
                      className={`text-[9px] border p-1 font-sans cursor-pointer transition-all flex items-center gap-1 leading-tight select-none rounded-none ${
                        colors.bg
                      } ${isSelected ? "ring-1 ring-[#1A1A1A] font-medium" : "border-transparent"}`}
                      title={`${commitment.title} (${commitment.priority} Priority, Due: ${commitment.deadline})`}
                    >
                      <span className={`w-1 h-1 rounded-full ${colors.indicator} flex-shrink-0`} />
                      <span className="truncate flex-1 font-medium">{commitment.title}</span>
                    </div>
                  );
                })}

                {/* Google Calendar Events */}
                {getGoogleEventsForDate(dateString).map((ev) => {
                  const startDateTime = ev.start.dateTime;
                  let timeStr = "";
                  if (startDateTime) {
                    const d = new Date(startDateTime);
                    timeStr = d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });
                  }

                  return (
                    <div
                      key={ev.id}
                      className="text-[8px] bg-emerald-50 border border-emerald-100 text-emerald-800 px-1 py-0.5 font-mono flex items-center gap-1 leading-tight select-none rounded-none"
                      title={`Google Calendar: ${ev.summary}`}
                    >
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
                      <span className="truncate flex-1 font-medium">
                        {timeStr ? `[${timeStr}] ` : ""}{ev.summary}
                      </span>
                    </div>
                  );
                })}

                {/* Complete archived count */}
                {dateCommitments.some((c) => c.status === "Completed") && (
                  <div className="text-[8px] font-mono text-gray-450 italic text-center py-0.5 bg-gray-50 uppercase tracking-tight">
                    ✓ {dateCommitments.filter((c) => c.status === "Completed").length} Completed
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Calendar Legend */}
      <div className="flex flex-wrap items-center gap-4 text-[9px] font-mono text-gray-400 border-t border-[#1A1A1A]/5 pt-2.5 justify-center">
        <span className="flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-rose-500" /> High Priority
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-amber-500" /> Medium Priority
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-slate-400" /> Low Priority
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" /> Google Event
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 ring-1 ring-indigo-600 block rounded-sm bg-transparent" /> Today
        </span>
      </div>
    </div>
  );
}
