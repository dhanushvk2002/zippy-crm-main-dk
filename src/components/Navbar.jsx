

import { Search, Plus } from "lucide-react";

function Navbar({ activeItem }) {
  return (
    <header className="navbar">

      <div className="navbar-title">
        <h1>{activeItem}</h1>
      </div>

      <div className="navbar-actions">

        <div style={{ position: "relative", display: "inline-flex", alignItems: "center" }}>
          <Search size={15} style={{ position: "absolute", left: "10px", color: "var(--muted-foreground, #64748b)", pointerEvents: "none" }} />
          <input
            type="text"
            placeholder="Search full_name"
            className="search-input"
            style={{ paddingLeft: "32px" }}
          />
        </div>

        <button className="primary-button" style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}>
          <Plus size={16} strokeWidth={2.5} />
          <span>New record</span>
        </button>

        <button className="nav-button active">
          Dashboard
        </button>

        <button className="nav-button active">
          Data
        </button>

        <button className="nav-button active">
          Bulk tools
        </button>

        <button className="nav-button">
          Sales CRM
        </button>

        <button className="nav-button">
          Console
        </button>

      </div>

    </header>
  );
}

export default Navbar;