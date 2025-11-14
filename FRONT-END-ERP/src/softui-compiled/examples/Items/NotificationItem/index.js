function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
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

import { forwardRef } from "react";

// prop-types is a library for typechecking of props.
import PropTypes from "prop-types";

// @mui material components
import MenuItem from "@mui/material/MenuItem";
import Icon from "@mui/material/Icon";

// Soft UI Dashboard React components
import SoftBox from "components/SoftBox";
import SoftTypography from "components/SoftTypography";

// custom styles for the NotificationItem
import { menuItem, menuImage } from "examples/Items/NotificationItem/styles";
const NotificationItem = /*#__PURE__*/forwardRef(({
  color,
  image,
  title,
  date,
  ...rest
}, ref) => /*#__PURE__*/React.createElement(MenuItem, _extends({}, rest, {
  ref: ref,
  sx: theme => menuItem(theme)
}), /*#__PURE__*/React.createElement(SoftBox, {
  width: "2.25rem",
  height: "2.25rem",
  mt: 0.25,
  mr: 2,
  mb: 0.25,
  borderRadius: "lg",
  sx: theme => menuImage(theme, {
    color
  })
}, image), /*#__PURE__*/React.createElement(SoftBox, null, /*#__PURE__*/React.createElement(SoftTypography, {
  variant: "button",
  textTransform: "capitalize",
  fontWeight: "regular"
}, /*#__PURE__*/React.createElement("strong", null, title[0]), " ", title[1]), /*#__PURE__*/React.createElement(SoftTypography, {
  variant: "caption",
  color: "secondary",
  sx: {
    display: "flex",
    alignItems: "center",
    mt: 0.5
  }
}, /*#__PURE__*/React.createElement(SoftTypography, {
  variant: "button",
  color: "secondary"
}, /*#__PURE__*/React.createElement(Icon, {
  sx: {
    lineHeight: 1.2,
    mr: 0.5
  }
}, "watch_later")), date))));

// Setting default values for the props of NotificationItem
NotificationItem.defaultProps = {
  color: "dark"
};

// Typechecking props for the NotificationItem
NotificationItem.propTypes = {
  color: PropTypes.oneOf(["primary", "secondary", "info", "success", "warning", "error", "light", "dark"]),
  image: PropTypes.node.isRequired,
  title: PropTypes.arrayOf(PropTypes.string).isRequired,
  date: PropTypes.string.isRequired
};
export default NotificationItem;