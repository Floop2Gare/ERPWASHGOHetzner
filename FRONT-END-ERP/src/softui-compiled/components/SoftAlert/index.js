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

import { useState } from "react";

// prop-types is a library for typechecking of props
import PropTypes from "prop-types";

// @mui material components
import Fade from "@mui/material/Fade";

// Soft UI Dashboard React components
import SoftBox from "components/SoftBox";

// Custom styles for the SoftAlert
import SoftAlertRoot from "components/SoftAlert/SoftAlertRoot";
import SoftAlertCloseIcon from "components/SoftAlert/SoftAlertCloseIcon";
function SoftAlert({
  color,
  dismissible,
  children,
  ...rest
}) {
  const [alertStatus, setAlertStatus] = useState("mount");
  const handleAlertStatus = () => setAlertStatus("fadeOut");

  // The base template for the alert
  const alertTemplate = (mount = true) => /*#__PURE__*/React.createElement(Fade, {
    in: mount,
    timeout: 300
  }, /*#__PURE__*/React.createElement(SoftAlertRoot, _extends({
    ownerState: {
      color
    }
  }, rest), /*#__PURE__*/React.createElement(SoftBox, {
    display: "flex",
    alignItems: "center",
    color: "white"
  }, children), dismissible ? /*#__PURE__*/React.createElement(SoftAlertCloseIcon, {
    onClick: mount ? handleAlertStatus : null
  }, "\xD7") : null));
  switch (true) {
    case alertStatus === "mount":
      return alertTemplate();
    case alertStatus === "fadeOut":
      setTimeout(() => setAlertStatus("unmount"), 400);
      return alertTemplate(false);
    default:
      alertTemplate();
      break;
  }
  return null;
}

// Setting default values for the props of SoftAlert
SoftAlert.defaultProps = {
  color: "info",
  dismissible: false
};

// Typechecking props of the SoftAlert
SoftAlert.propTypes = {
  color: PropTypes.oneOf(["primary", "secondary", "info", "success", "warning", "error", "light", "dark"]),
  dismissible: PropTypes.bool,
  children: PropTypes.node.isRequired
};
export default SoftAlert;