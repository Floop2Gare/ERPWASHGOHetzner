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

// Custom styles for SoftInput
import SoftInputRoot from "components/SoftInput/SoftInputRoot";
import SoftInputWithIconRoot from "components/SoftInput/SoftInputWithIconRoot";
import SoftInputIconBoxRoot from "components/SoftInput/SoftInputIconBoxRoot";
import SoftInputIconRoot from "components/SoftInput/SoftInputIconRoot";

// Soft UI Dashboard React contexts
import { useSoftUIController } from "context";
const SoftInput = /*#__PURE__*/forwardRef(({
  size,
  icon,
  error,
  success,
  disabled,
  ...rest
}, ref) => {
  let template;
  const [controller] = useSoftUIController();
  const {
    direction
  } = controller;
  const iconDirection = icon.direction;
  if (icon.component && icon.direction === "left") {
    template = /*#__PURE__*/React.createElement(SoftInputWithIconRoot, {
      ref: ref,
      ownerState: {
        error,
        success,
        disabled
      }
    }, /*#__PURE__*/React.createElement(SoftInputIconBoxRoot, {
      ownerState: {
        size
      }
    }, /*#__PURE__*/React.createElement(SoftInputIconRoot, {
      fontSize: "small",
      ownerState: {
        size
      }
    }, icon.component)), /*#__PURE__*/React.createElement(SoftInputRoot, _extends({}, rest, {
      ownerState: {
        size,
        error,
        success,
        iconDirection,
        direction,
        disabled
      }
    })));
  } else if (icon.component && icon.direction === "right") {
    template = /*#__PURE__*/React.createElement(SoftInputWithIconRoot, {
      ref: ref,
      ownerState: {
        error,
        success,
        disabled
      }
    }, /*#__PURE__*/React.createElement(SoftInputRoot, _extends({}, rest, {
      ownerState: {
        size,
        error,
        success,
        iconDirection,
        direction,
        disabled
      }
    })), /*#__PURE__*/React.createElement(SoftInputIconBoxRoot, {
      ownerState: {
        size
      }
    }, /*#__PURE__*/React.createElement(SoftInputIconRoot, {
      fontSize: "small",
      ownerState: {
        size
      }
    }, icon.component)));
  } else {
    template = /*#__PURE__*/React.createElement(SoftInputRoot, _extends({}, rest, {
      ref: ref,
      ownerState: {
        size,
        error,
        success,
        disabled
      }
    }));
  }
  return template;
});

// Setting default values for the props of SoftInput
SoftInput.defaultProps = {
  size: "medium",
  icon: {
    component: false,
    direction: "none"
  },
  error: false,
  success: false,
  disabled: false
};

// Typechecking props for the SoftInput
SoftInput.propTypes = {
  size: PropTypes.oneOf(["small", "medium", "large"]),
  icon: PropTypes.shape({
    component: PropTypes.oneOfType([PropTypes.node, PropTypes.bool]),
    direction: PropTypes.oneOf(["none", "left", "right"])
  }),
  error: PropTypes.bool,
  success: PropTypes.bool,
  disabled: PropTypes.bool
};
export default SoftInput;