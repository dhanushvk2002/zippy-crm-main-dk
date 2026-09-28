import React, { useState, useEffect, useRef } from "react";
import { Calendar, ChevronLeft, ChevronRight, X } from "lucide-react";

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"
];

const MONTH_SHORT = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"
];

const WEEK_DAYS = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];

function pad2(n) {
  return String(n).padStart(2, "0");
}

function toIsoString(year, monthIndex, day) {
  return `${year}-${pad2(monthIndex + 1)}-${pad2(day)}`;
}

function parseIsoString(str) {
  if (!str || typeof str !== "string") return null;
  const parts = str.split("-");
  if (parts.length !== 3) return null;
  const y = parseInt(parts[0], 10);
  const m = parseInt(parts[1], 10) - 1;
  const d = parseInt(parts[2], 10);
  if (isNaN(y) || isNaN(m) || isNaN(d)) return null;
  return { year: y, month: m, day: d };
}

function formatDisplayDate(isoStr) {
  const parsed = parseIsoString(isoStr);
  if (!parsed) return "";
  const { year, month, day } = parsed;
  return `${day} ${MONTH_SHORT[month]} ${year}`;
}

export default function ModernDatePicker({
  value = "",
  onChange,
  min = "",
  max = "",
  placeholder = "Select date...",
  disabled = false,
  required = false,
  id,
  name,
  className = "",
  style = {},
  autoCloseOnSelect = true
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [viewMode, setViewMode] = useState("days"); // "days" | "months" | "years"
  const [placement, setPlacement] = useState("bottom"); // "bottom" | "top"

  const now = new Date();
  const todayYear = now.getFullYear();
  const todayMonth = now.getMonth();
  const todayDay = now.getDate();
  const todayIso = toIsoString(todayYear, todayMonth, todayDay);

  const parsedVal = parseIsoString(value);
  const [viewYear, setViewYear] = useState(() => parsedVal?.year ?? todayYear);
  const [viewMonth, setViewMonth] = useState(() => parsedVal?.month ?? todayMonth);

  const containerRef = useRef(null);
  const triggerRef = useRef(null);

  // Auto-detect best placement (top or bottom)
  useEffect(() => {
    if (isOpen && triggerRef.current) {
      const rect = triggerRef.current.getBoundingClientRect();
      const spaceBelow = window.innerHeight - rect.bottom;
      const spaceAbove = rect.top;
      if (spaceBelow < 330 && spaceAbove > 330) {
        setPlacement("top");
      } else {
        setPlacement("bottom");
      }
    }
  }, [isOpen]);

  // Sync view when opened or when value changes
  useEffect(() => {
    if (parsedVal) {
      setViewYear(parsedVal.year);
      setViewMonth(parsedVal.month);
    }
  }, [value]);

  // Click outside to close
  useEffect(() => {
    if (!isOpen) return;

    function handleClickOutside(e) {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setIsOpen(false);
        setViewMode("days");
      }
    }

    function handleKeyDown(e) {
      if (e.key === "Escape") {
        setIsOpen(false);
        setViewMode("days");
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen]);

  const emitChange = (dateStr) => {
    if (onChange) {
      const syntheticEvent = {
        target: { id, name, value: dateStr },
        currentTarget: { id, name, value: dateStr },
        value: dateStr,
        toString: () => dateStr
      };
      onChange(syntheticEvent);
    }
  };

  const handleSelectDate = (dateStr) => {
    emitChange(dateStr);
    if (autoCloseOnSelect) {
      setIsOpen(false);
      setViewMode("days");
    }
  };

  const handleClear = (e) => {
    e.stopPropagation();
    emitChange("");
  };

  const handleToday = (e) => {
    e.stopPropagation();
    setViewYear(todayYear);
    setViewMonth(todayMonth);
    handleSelectDate(todayIso);
  };

  const prevMonth = (e) => {
    e.stopPropagation();
    if (viewMonth === 0) {
      setViewMonth(11);
      setViewYear((y) => y - 1);
    } else {
      setViewMonth((m) => m - 1);
    }
  };

  const nextMonth = (e) => {
    e.stopPropagation();
    if (viewMonth === 11) {
      setViewMonth(0);
      setViewYear((y) => y + 1);
    } else {
      setViewMonth((m) => m + 1);
    }
  };

  // Build Day Grid
  const daysInCurrentMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
  const firstDayOfWeek = new Date(viewYear, viewMonth, 1).getDay(); // 0 = Sun
  const daysInPrevMonth = new Date(viewYear, viewMonth, 0).getDate();

  const calendarDays = [];

  // Trailing previous month days
  for (let i = firstDayOfWeek - 1; i >= 0; i--) {
    const d = daysInPrevMonth - i;
    const prevM = viewMonth === 0 ? 11 : viewMonth - 1;
    const prevY = viewMonth === 0 ? viewYear - 1 : viewYear;
    const iso = toIsoString(prevY, prevM, d);
    calendarDays.push({
      day: d,
      month: prevM,
      year: prevY,
      iso,
      isCurrentMonth: false,
      isDisabled: (min && iso < min) || (max && iso > max)
    });
  }

  // Current month days
  for (let d = 1; d <= daysInCurrentMonth; d++) {
    const iso = toIsoString(viewYear, viewMonth, d);
    calendarDays.push({
      day: d,
      month: viewMonth,
      year: viewYear,
      iso,
      isCurrentMonth: true,
      isDisabled: (min && iso < min) || (max && iso > max)
    });
  }

  // Leading next month days to complete rows (clean 35 or 42 slots)
  const remaining = (7 - (calendarDays.length % 7)) % 7;
  for (let d = 1; d <= remaining; d++) {
    const nextM = viewMonth === 11 ? 0 : viewMonth + 1;
    const nextY = viewMonth === 11 ? viewYear + 1 : viewYear;
    const iso = toIsoString(nextY, nextM, d);
    calendarDays.push({
      day: d,
      month: nextM,
      year: nextY,
      iso,
      isCurrentMonth: false,
      isDisabled: (min && iso < min) || (max && iso > max)
    });
  }

  // Available years for year picker (6 years back, 5 years forward)
  const startYear = viewYear - 5;
  const yearRange = Array.from({ length: 12 }, (_, i) => startYear + i);

  return (
    <div
      ref={containerRef}
      className={`modern-datepicker-container ${className} ${disabled ? "is-disabled" : ""}`}
      style={style}
    >
      {/* Hidden input for HTML form compliance and required validation */}
      <input
        type="hidden"
        id={id}
        name={name}
        value={value || ""}
        required={required}
      />

      {/* Styled Interactive Trigger */}
      <button
        ref={triggerRef}
        type="button"
        className={`modern-datepicker-trigger ${isOpen ? "is-active" : ""} ${value ? "has-value" : ""}`}
        onClick={() => !disabled && setIsOpen(!isOpen)}
        disabled={disabled}
        aria-haspopup="dialog"
        aria-expanded={isOpen}
      >
        <span className="mdp-trigger-icon">
          <Calendar size={15} />
        </span>

        <span className={`mdp-trigger-text ${!value ? "mdp-placeholder" : ""}`}>
          {value ? formatDisplayDate(value) : placeholder}
        </span>

        <div className="mdp-trigger-actions">
          {value && !disabled && (
            <span
              role="button"
              tabIndex={0}
              className="mdp-trigger-clear"
              onClick={handleClear}
              onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") handleClear(e); }}
              title="Clear date"
            >
              <X size={13} />
            </span>
          )}
          <span className={`mdp-trigger-chevron ${isOpen ? "chevron-open" : ""}`}>
            ▾
          </span>
        </div>
      </button>

      {/* Calendar Popover */}
      {isOpen && (
        <div
          className={`modern-datepicker-popover placement-${placement}`}
          role="dialog"
          aria-modal="true"
        >
          {/* Header */}
          <div className="mdp-header">
            <button
              type="button"
              className="mdp-nav-btn"
              onClick={prevMonth}
              title="Previous month"
            >
              <ChevronLeft size={16} />
            </button>

            <div className="mdp-header-title">
              <button
                type="button"
                className={`mdp-title-btn ${viewMode === "months" ? "active" : ""}`}
                onClick={() => setViewMode(viewMode === "months" ? "days" : "months")}
                title="Choose month"
              >
                {MONTH_NAMES[viewMonth]}
              </button>
              <button
                type="button"
                className={`mdp-title-btn ${viewMode === "years" ? "active" : ""}`}
                onClick={() => setViewMode(viewMode === "years" ? "days" : "years")}
                title="Choose year"
              >
                {viewYear}
              </button>
            </div>

            <button
              type="button"
              className="mdp-nav-btn"
              onClick={nextMonth}
              title="Next month"
            >
              <ChevronRight size={16} />
            </button>
          </div>

          {/* Quick Month Switcher View */}
          {viewMode === "months" && (
            <div className="mdp-months-grid">
              {MONTH_SHORT.map((mName, idx) => (
                <button
                  key={mName}
                  type="button"
                  className={`mdp-month-cell ${idx === viewMonth ? "selected" : ""} ${idx === todayMonth && viewYear === todayYear ? "today" : ""}`}
                  onClick={() => {
                    setViewMonth(idx);
                    setViewMode("days");
                  }}
                >
                  {mName}
                </button>
              ))}
            </div>
          )}

          {/* Quick Year Switcher View */}
          {viewMode === "years" && (
            <div className="mdp-years-wrapper">
              <div className="mdp-years-controls">
                <button
                  type="button"
                  className="mdp-nav-btn-sm"
                  onClick={() => setViewYear((y) => y - 12)}
                >
                  «
                </button>
                <span className="mdp-year-range-label">{startYear} - {startYear + 11}</span>
                <button
                  type="button"
                  className="mdp-nav-btn-sm"
                  onClick={() => setViewYear((y) => y + 12)}
                >
                  »
                </button>
              </div>
              <div className="mdp-years-grid">
                {yearRange.map((yr) => (
                  <button
                    key={yr}
                    type="button"
                    className={`mdp-year-cell ${yr === viewYear ? "selected" : ""} ${yr === todayYear ? "today" : ""}`}
                    onClick={() => {
                      setViewYear(yr);
                      setViewMode("days");
                    }}
                  >
                    {yr}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Regular Days View */}
          {viewMode === "days" && (
            <>
              {/* Day of week headers */}
              <div className="mdp-weekdays-row">
                {WEEK_DAYS.map((wd, i) => (
                  <div
                    key={wd}
                    className={`mdp-weekday ${i === 0 || i === 6 ? "mdp-weekend" : ""}`}
                  >
                    {wd}
                  </div>
                ))}
              </div>

              {/* Day Grid */}
              <div className="mdp-days-grid">
                {calendarDays.map((item, index) => {
                  const isSelected = item.iso === value;
                  const isToday = item.iso === todayIso;

                  let cellClass = "mdp-day-cell";
                  if (!item.isCurrentMonth) cellClass += " outside-month";
                  if (isSelected) cellClass += " is-selected";
                  if (isToday) cellClass += " is-today";
                  if (item.isDisabled) cellClass += " is-disabled";

                  return (
                    <button
                      key={`${item.iso}-${index}`}
                      type="button"
                      disabled={item.isDisabled}
                      className={cellClass}
                      onClick={() => handleSelectDate(item.iso)}
                      title={item.iso}
                    >
                      <span className="mdp-day-number">{item.day}</span>
                      {isToday && !isSelected && <span className="mdp-today-dot"></span>}
                    </button>
                  );
                })}
              </div>
            </>
          )}

          {/* Footer Controls */}
          <div className="mdp-footer">
            <button
              type="button"
              className="mdp-footer-btn mdp-btn-clear"
              onClick={handleClear}
              disabled={!value}
            >
              Clear
            </button>

            {value && (
              <span className="mdp-footer-current">
                {formatDisplayDate(value)}
              </span>
            )}

            <button
              type="button"
              className="mdp-footer-btn mdp-btn-today"
              onClick={handleToday}
            >
              Today
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
