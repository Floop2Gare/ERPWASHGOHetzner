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

// prop-types is a library for typechecking of props.
import PropTypes from "prop-types";

// @mui material components
import Collapse from "@mui/material/Collapse";
import ListItem from "@mui/material/ListItem";
import ListItemIcon from "@mui/material/ListItemIcon";
import ListItemText from "@mui/material/ListItemText";
import Icon from "@mui/material/Icon";

// Soft UI Dashboard React components
import SoftBox from "components/SoftBox";

// Custom styles for the SidenavCollapse
import { collapseItem, collapseIconBox, collapseIcon, collapseText } from "examples/Sidenav/styles/sidenavCollapse";

// Soft UI Dashboard React context
import { useSoftUIController } from "context";
function SidenavCollapse({
  color,
  icon,
  name,
  children,
  active,
  noCollapse,
  open,
  ...rest
}) {
  const [controller] = useSoftUIController();
  const {
    miniSidenav,
    transparentSidenav
  } = controller;
  return /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement(ListItem, {
    component: "li"
  }, /*#__PURE__*/React.createElement(SoftBox, _extends({}, rest, {
    sx: theme => collapseItem(theme, {
      active,
      transparentSidenav
    })
  }), /*#__PURE__*/React.createElement(ListItemIcon, {
    sx: theme => collapseIconBox(theme, {
      active,
      transparentSidenav,
      color
    })
  }, typeof icon === "string" ? /*#__PURE__*/React.createElement(Icon, {
    sx: theme => collapseIcon(theme, {
      active
    })
  }, icon) : icon), /*#__PURE__*/React.createElement(ListItemText, {
    primary: name,
    sx: theme => collapseText(theme, {
      miniSidenav,
      transparentSidenav,
      active
    })
  }))), children && /*#__PURE__*/React.createElement(Collapse, {
    in: open,
    unmountOnExit: true
  }, children));
}

// Setting default values for the props of SidenavCollapse
SidenavCollapse.defaultProps = {
  color: "info",
  active: false,
  noCollapse: false,
  children: false,
  open: false
};

// Typechecking props for the SidenavCollapse
SidenavCollapse.propTypes = {
  color: PropTypes.oneOf(["primary", "secondary", "info", "success", "warning", "error", "dark"]),
  icon: PropTypes.node.isRequired,
  name: PropTypes.string.isRequired,
  children: PropTypes.node,
  active: PropTypes.bool,
  noCollapse: PropTypes.bool,
  open: PropTypes.bool
};
export default SidenavCollapse;