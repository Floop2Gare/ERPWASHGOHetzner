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

// prop-types is a library for typechecking of props
import PropTypes from "prop-types";

// Soft UI Dashboard React components
import SoftTypography from "components/SoftTypography";

// Custom styles for SoftProgress
import SoftProgressRoot from "components/SoftProgress/SoftProgressRoot";
const SoftProgress = /*#__PURE__*/forwardRef(({
  variant,
  color,
  value,
  label,
  ...rest
}, ref) => /*#__PURE__*/React.createElement(React.Fragment, null, label && /*#__PURE__*/React.createElement(SoftTypography, {
  variant: "button",
  fontWeight: "medium",
  color: "text"
}, value, "%"), /*#__PURE__*/React.createElement(SoftProgressRoot, _extends({}, rest, {
  ref: ref,
  variant: "determinate",
  value: value,
  ownerState: {
    color,
    value,
    variant
  }
}))));

// Setting default values for the props of SoftProgress
SoftProgress.defaultProps = {
  variant: "contained",
  color: "info",
  value: 0,
  label: false
};

// Typechecking props for the SoftProgress
SoftProgress.propTypes = {
  variant: PropTypes.oneOf(["contained", "gradient"]),
  color: PropTypes.oneOf(["primary", "secondary", "info", "success", "warning", "error", "light", "dark"]),
  value: PropTypes.number,
  label: PropTypes.bool
};
export default SoftProgress;