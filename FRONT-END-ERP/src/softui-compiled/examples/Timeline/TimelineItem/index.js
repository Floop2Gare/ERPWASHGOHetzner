/**
=========================================================
* Soft UI Dashboard React - v4.0.1
=========================================================

* Product Page: https://www.creative-tim.com/product/soft-ui-dashboard-react
* Copyright 2023 Creative Tim (https://www.creative-tim.com)

Coded by www.creative-tim.com

 =========================================================

* The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.
*/

// prop-types is a library for typechecking of props
import PropTypes from "prop-types";

// @mui material components
import Icon from "@mui/material/Icon";

// Soft UI Dashboard React components
import SoftBox from "components/SoftBox";
import SoftTypography from "components/SoftTypography";
import SoftBadge from "components/SoftBadge";

// Timeline context
import { useTimeline } from "examples/Timeline/context";

// Custom styles for the TimelineItem
import { timelineItem, timelineItemIcon } from "examples/Timeline/TimelineItem/styles";
function TimelineItem({
  color,
  icon,
  title,
  dateTime,
  description,
  badges,
  lastItem
}) {
  const isDark = useTimeline();
  const renderBadges = badges.length > 0 ? badges.map((badge, key) => {
    const badgeKey = `badge-${key}`;
    return /*#__PURE__*/React.createElement(SoftBox, {
      key: badgeKey,
      mr: key === badges.length - 1 ? 0 : 0.5
    }, /*#__PURE__*/React.createElement(SoftBadge, {
      color: color,
      size: "xs",
      badgeContent: badge,
      container: true
    }));
  }) : null;
  return /*#__PURE__*/React.createElement(SoftBox, {
    position: "relative",
    sx: theme => timelineItem(theme, {
      lastItem
    })
  }, /*#__PURE__*/React.createElement(SoftBox, {
    bgColor: isDark ? "dark" : "white",
    width: "1.625rem",
    height: "1.625rem",
    borderRadius: "50%",
    position: "absolute",
    top: "3.25%",
    left: "2px",
    zIndex: 2
  }, /*#__PURE__*/React.createElement(Icon, {
    sx: theme => timelineItemIcon(theme, {
      color
    })
  }, icon)), /*#__PURE__*/React.createElement(SoftBox, {
    ml: 5.75,
    pt: description ? 0.7 : 0.5,
    lineHeight: 0,
    maxWidth: "30rem"
  }, /*#__PURE__*/React.createElement(SoftTypography, {
    variant: "button",
    fontWeight: "medium",
    color: isDark ? "white" : "dark"
  }, title), /*#__PURE__*/React.createElement(SoftBox, {
    mt: 0.5
  }, /*#__PURE__*/React.createElement(SoftTypography, {
    variant: "caption",
    fontWeight: "medium",
    color: isDark ? "secondary" : "text"
  }, dateTime)), /*#__PURE__*/React.createElement(SoftBox, {
    mt: 2,
    mb: 1.5
  }, description ? /*#__PURE__*/React.createElement(SoftTypography, {
    variant: "button",
    fontWeight: "regular",
    color: "text"
  }, description) : null), badges.length > 0 ? /*#__PURE__*/React.createElement(SoftBox, {
    display: "flex",
    pb: lastItem ? 1 : 2
  }, renderBadges) : null));
}

// Setting default values for the props of TimelineItem
TimelineItem.defaultProps = {
  color: "info",
  badges: [],
  lastItem: false,
  description: ""
};

// Typechecking props for the TimelineItem
TimelineItem.propTypes = {
  color: PropTypes.oneOf(["primary", "secondary", "info", "success", "warning", "error", "dark", "light"]),
  icon: PropTypes.node.isRequired,
  title: PropTypes.string.isRequired,
  dateTime: PropTypes.string.isRequired,
  description: PropTypes.string,
  badges: PropTypes.arrayOf(PropTypes.oneOfType([PropTypes.string, PropTypes.number])),
  lastItem: PropTypes.bool
};
export default TimelineItem;