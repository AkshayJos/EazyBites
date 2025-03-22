import React from "react";
import "./Menu.css";

const Menu = React.forwardRef((props, ref) => {
  return (
    <section className="Menu-section">
      <div className="Menu-container" id="Menu" ref={ref}>
        <h2 className="Menu-title">Our Menu</h2>
        <div className="Menu-content">
          {/* Placeholder content - will be designed later */}
          <p className="Menu-placeholder-text">
            Menu content will be added here. This is a temporary placeholder.
          </p>
        </div>
      </div>
    </section>
  );
});

export default Menu;