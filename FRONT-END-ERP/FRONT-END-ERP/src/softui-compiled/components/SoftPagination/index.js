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

import { forwardRef, createContext, useContext, useMemo } from "react";

// prop-types is a library for typechecking of props
import PropTypes from "prop-types";

// Soft UI Dashboard React components
import SoftBox from "components/SoftBox";

// Custom styles for SoftPagination
import SoftPaginationItemRoot from "components/SoftPagination/SoftPaginationItemRoot";

// The Pagination main context
const Context = /*#__PURE__*/createContext(null);
const SoftPagination = /*#__PURE__*/forwardRef(({
  item,
  variant,
  color,
  size,
  active,
  children,
  ...rest
}, ref) => {
  const context = item ? useContext(Context) : null;
  const paginationSize = context ? context.size : null;
  const value = useMemo(() => ({
    variant,
    color,
    size
  }), [variant, color, size]);
  return /*#__PURE__*/React.createElement(Context.Provider, {
    value: value
  }, item ? /*#__PURE__*/React.createElement(SoftPaginationItemRoot, _extends({}, rest, {
    ref: ref,
    variant: active ? context.variant : "outlined",
    color: active ? context.color : "secondary",
    iconOnly: true,
    circular: true,
    ownerState: {
      variant,
      active,
      paginationSize
    }
  }), children) : /*#__PURE__*/React.createElement(SoftBox, {
    display: "flex",
    justifyContent: "flex-end",
    alignItems: "center",
    sx: {
      listStyle: "none"
    }
  }, children));
});

// Setting default values for the props of SoftPagination
SoftPagination.defaultProps = {
  item: false,
  variant: "gradient",
  color: "info",
  size: "medium",
  active: false
};

// Typechecking props for the SoftPagination
SoftPagination.propTypes = {
  item: PropTypes.bool,
  variant: PropTypes.oneOf(["gradient", "contained"]),
  color: PropTypes.oneOf(["white", "primary", "secondary", "info", "success", "warning", "error", "light", "dark"]),
  size: PropTypes.oneOf(["small", "medium", "large"]),
  active: PropTypes.bool,
  children: PropTypes.node.isRequired
};
export default SoftPagination;