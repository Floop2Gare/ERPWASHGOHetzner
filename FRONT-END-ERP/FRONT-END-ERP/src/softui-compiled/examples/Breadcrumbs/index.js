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

// react-router-dom components
import { Link } from "react-router-dom";

// prop-types is a library for typechecking of props.
import PropTypes from "prop-types";

// @mui material components
import { Breadcrumbs as MuiBreadcrumbs } from "@mui/material";
import Icon from "@mui/material/Icon";

// Soft UI Dashboard React components
import SoftBox from "components/SoftBox";
import SoftTypography from "components/SoftTypography";
function Breadcrumbs({
  icon,
  title,
  route,
  light
}) {
  const routes = route.slice(0, -1);
  return /*#__PURE__*/React.createElement(SoftBox, {
    mr: {
      xs: 0,
      xl: 8
    }
  }, /*#__PURE__*/React.createElement(MuiBreadcrumbs, {
    sx: {
      "& .MuiBreadcrumbs-separator": {
        color: ({
          palette: {
            white,
            grey
          }
        }) => light ? white.main : grey[600]
      }
    }
  }, /*#__PURE__*/React.createElement(Link, {
    to: "/"
  }, /*#__PURE__*/React.createElement(SoftTypography, {
    component: "span",
    variant: "body2",
    color: light ? "white" : "dark",
    opacity: light ? 0.8 : 0.5,
    sx: {
      lineHeight: 0
    }
  }, /*#__PURE__*/React.createElement(Icon, null, icon))), routes.map(el => /*#__PURE__*/React.createElement(Link, {
    to: `/${el}`,
    key: el
  }, /*#__PURE__*/React.createElement(SoftTypography, {
    component: "span",
    variant: "button",
    fontWeight: "regular",
    textTransform: "capitalize",
    color: light ? "white" : "dark",
    opacity: light ? 0.8 : 0.5,
    sx: {
      lineHeight: 0
    }
  }, el))), /*#__PURE__*/React.createElement(SoftTypography, {
    variant: "button",
    fontWeight: "regular",
    textTransform: "capitalize",
    color: light ? "white" : "dark",
    sx: {
      lineHeight: 0
    }
  }, title.replace("-", " "))), /*#__PURE__*/React.createElement(SoftTypography, {
    fontWeight: "bold",
    textTransform: "capitalize",
    variant: "h6",
    color: light ? "white" : "dark",
    noWrap: true
  }, title.replace("-", " ")));
}

// Setting default values for the props of Breadcrumbs
Breadcrumbs.defaultProps = {
  light: false
};

// Typechecking props for the Breadcrumbs
Breadcrumbs.propTypes = {
  icon: PropTypes.node.isRequired,
  title: PropTypes.string.isRequired,
  route: PropTypes.oneOfType([PropTypes.string, PropTypes.array]).isRequired,
  light: PropTypes.bool
};
export default Breadcrumbs;