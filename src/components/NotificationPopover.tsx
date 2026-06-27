import React, { useState, useRef, useEffect } from "react";
import { Notification } from "../types";
import { Bell, BellOff, Check, Trash2, X, AlertTriangle, Info, Sparkles, CheckCircle2 } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

interface NotificationPopoverProps {
  notifications: Notification[];
  onMarkAsRead: (id: string) => void;
  onMarkAllAsRead: () => void;
  onDeleteNotification: (id: string) => void;
  onClearAll: () => void;
}

export default function NotificationPopover({
  notifications,
  onMarkAsRead,
  onMarkAllAsRead,
  onDeleteNotification,
  onClearAll,
}: NotificationPopoverProps) {
  const [isOpen, setIsOpen] = useState(false);
  const popoverRef = useRef<HTMLDivElement>(null);

  const unreadCount = notifications.filter((n) => !n.read).length;

  // Close popover when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (popoverRef.current && !popoverRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const getIcon = (type: string) => {
    switch (type) {
      case "warning":
        return <AlertTriangle className="w-4 h-4 text-amber-600" />;
      case "risk":
        return <AlertTriangle className="w-4 h-4 text-rose-600" />;
      case "success":
        return <CheckCircle2 className="w-4 h-4 text-emerald-600" />;
      case "info":
      default:
        return <Info className="w-4 h-4 text-indigo-600" />;
    }
  };

  const getBgColor = (type: string, read: boolean) => {
    if (read) return "bg-transparent";
    switch (type) {
      case "warning":
        return "bg-amber-500/[0.04]";
      case "risk":
        return "bg-rose-500/[0.04]";
      case "success":
        return "bg-emerald-500/[0.04]";
      case "info":
      default:
        return "bg-indigo-500/[0.04]";
    }
  };

  return (
    <div className="relative" ref={popoverRef}>
      {/* Bell Trigger */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2.5 border border-[#1A1A1A]/20 hover:bg-[#1A1A1A]/5 text-[#1A1A1A] transition-all cursor-pointer flex items-center justify-center focus:outline-none"
        aria-label="Toggle notifications"
      >
        <Bell className={`w-4 h-4 ${unreadCount > 0 ? "animate-pulse" : ""}`} />
        {unreadCount > 0 && (
          <span className="absolute -top-1.5 -right-1.5 bg-indigo-600 text-[#F4F1EE] font-mono font-bold text-[8px] h-4 min-w-4 px-1 rounded-full flex items-center justify-center border border-[#F4F1EE]">
            {unreadCount}
          </span>
        )}
      </button>

      {/* Popover Dropdown */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.98 }}
            transition={{ duration: 0.15 }}
            className="absolute right-0 mt-2.5 w-80 sm:w-96 bg-white border border-[#1A1A1A]/10 shadow-xl z-50 rounded-none flex flex-col max-h-[480px]"
          >
            {/* Popover Header */}
            <div className="p-4 border-b border-[#1A1A1A]/10 flex items-center justify-between bg-white">
              <div className="flex items-center gap-2">
                <span className="text-[10px] uppercase font-bold tracking-[0.15em] font-mono text-[#1A1A1A]/70">
                  Notification Inbox
                </span>
                {unreadCount > 0 && (
                  <span className="bg-indigo-100 text-indigo-800 font-mono text-[9px] font-bold px-1.5 py-0.5">
                    {unreadCount} NEW
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2">
                {notifications.length > 0 && (
                  <button
                    onClick={onMarkAllAsRead}
                    className="text-[9px] uppercase tracking-wider font-bold text-indigo-600 hover:text-indigo-800 transition-colors flex items-center gap-1 cursor-pointer"
                  >
                    <Check className="w-3 h-3" /> Mark Read
                  </button>
                )}
                <button
                  onClick={() => setIsOpen(false)}
                  className="text-gray-400 hover:text-[#1A1A1A] transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Notifications List */}
            <div className="flex-1 overflow-y-auto divide-y divide-[#1A1A1A]/5 scrollbar-thin">
              {notifications.length === 0 ? (
                <div className="py-12 px-4 text-center space-y-3">
                  <div className="w-10 h-10 border border-[#1A1A1A]/15 flex items-center justify-center mx-auto text-gray-350">
                    <BellOff className="w-5 h-5 opacity-40" />
                  </div>
                  <div>
                    <h4 className="text-xs font-serif italic text-gray-500">No updates on file</h4>
                    <p className="text-[10px] text-gray-400 mt-1 max-w-[200px] mx-auto leading-relaxed">
                      All system parameters are currently normal. New triggers will append here.
                    </p>
                  </div>
                </div>
              ) : (
                notifications.map((notification) => (
                  <div
                    key={notification.id}
                    className={`p-4 transition-all flex gap-3 relative ${getBgColor(
                      notification.type,
                      notification.read
                    )} hover:bg-[#1A1A1A]/[0.02]`}
                  >
                    <div className="mt-0.5 flex-shrink-0">{getIcon(notification.type)}</div>
                    <div className="flex-1 space-y-1 pr-6">
                      <div className="flex items-center gap-1.5">
                        <h5
                          className={`text-xs font-bold leading-none ${
                            notification.read ? "text-[#1A1A1A]/60" : "text-[#1A1A1A]"
                          }`}
                        >
                          {notification.title}
                        </h5>
                        {!notification.read && (
                          <span className="w-1.5 h-1.5 bg-indigo-600 rounded-full flex-shrink-0" />
                        )}
                      </div>
                      <p
                        className={`text-[11px] leading-relaxed ${
                          notification.read ? "text-gray-400" : "text-gray-600"
                        }`}
                      >
                        {notification.message}
                      </p>
                      <span className="text-[8px] font-mono text-gray-400 block pt-1">
                        {new Date(notification.createdAt).toLocaleTimeString([], {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}{" "}
                        • {new Date(notification.createdAt).toLocaleDateString()}
                      </span>
                    </div>

                    {/* Quick Action Overlay */}
                    <div className="absolute right-3 top-4 flex flex-col gap-2 opacity-30 hover:opacity-100 transition-opacity">
                      {!notification.read && notification.id && (
                        <button
                          onClick={() => onMarkAsRead(notification.id!)}
                          className="p-1 text-gray-400 hover:text-indigo-600 transition-colors cursor-pointer"
                          title="Mark as read"
                        >
                          <Check className="w-3.5 h-3.5" />
                        </button>
                      )}
                      {notification.id && (
                        <button
                          onClick={() => onDeleteNotification(notification.id!)}
                          className="p-1 text-gray-400 hover:text-rose-600 transition-colors cursor-pointer"
                          title="Dismiss"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Popover Footer */}
            {notifications.length > 0 && (
              <div className="p-3 bg-[#F4F1EE]/40 border-t border-[#1A1A1A]/10 flex items-center justify-between text-[9px] font-mono">
                <span className="text-gray-500">Total registers: {notifications.length}</span>
                <button
                  onClick={onClearAll}
                  className="text-rose-600 hover:text-rose-800 font-bold uppercase tracking-wider flex items-center gap-1 cursor-pointer"
                >
                  <Trash2 className="w-3 h-3" /> Clear All
                </button>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
