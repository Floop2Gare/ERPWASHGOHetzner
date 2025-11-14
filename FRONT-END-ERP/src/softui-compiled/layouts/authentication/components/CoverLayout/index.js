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
import Grid from "@mui/material/Grid";

// Soft UI Dashboard React components
import SoftBox from "components/SoftBox";
import SoftTypography from "components/SoftTypography";

// Soft UI Dashboard React examples
import DefaultNavbar from "examples/Navbars/DefaultNavbar";
import PageLayout from "examples/LayoutContainers/PageLayout";

// Authentication layout components
import Footer from "layouts/authentication/components/Footer";
function CoverLayout({
  color,
  header,
  title,
  description,
  image,
  top,
  children
}) {
  return /*#__PURE__*/React.createElement(PageLayout, {
    background: "white"
  }, /*#__PURE__*/React.createElement(DefaultNavbar, {
    action: {
      type: "external",
      route: "https://creative-tim.com/product/soft-ui-dashboard-react",
      label: "free download",
      color: "dark"
    }
  }), /*#__PURE__*/React.createElement(Grid, {
    container: true,
    justifyContent: "center",
    sx: {
      minHeight: "75vh",
      margin: 0
    }
  }, /*#__PURE__*/React.createElement(Grid, {
    item: true,
    xs: 11,
    sm: 8,
    md: 5,
    xl: 3
  }, /*#__PURE__*/React.createElement(SoftBox, {
    mt: top
  }, /*#__PURE__*/React.createElement(SoftBox, {
    pt: 3,
    px: 3
  }, !header ? /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement(SoftBox, {
    mb: 1
  }, /*#__PURE__*/React.createElement(SoftTypography, {
    variant: "h3",
    fontWeight: "bold",
    color: color,
    textGradient: true
  }, title)), /*#__PURE__*/React.createElement(SoftTypography, {
    variant: "body2",
    fontWeight: "regular",
    color: "text"
  }, description)) : header), /*#__PURE__*/React.createElement(SoftBox, {
    p: 3
  }, children))), /*#__PURE__*/React.createElement(Grid, {
    item: true,
    xs: 12,
    md: 5
  }, /*#__PURE__*/React.createElement(SoftBox, {
    height: "100%",
    display: {
      xs: "none",
      md: "block"
    },
    position: "relative",
    right: {
      md: "-12rem",
      xl: "-16rem"
    },
    mr: -16,
    sx: {
      transform: "skewX(-10deg)",
      overflow: "hidden",
      borderBottomLeftRadius: ({
        borders: {
          borderRadius
        }
      }) => borderRadius.lg
    }
  }, /*#__PURE__*/React.createElement(SoftBox, {
    ml: -8,
    height: "100%",
    sx: {
      backgroundImage: `url(${image})`,
      backgroundSize: "cover",
      transform: "skewX(10deg)"
    }
  })))), /*#__PURE__*/React.createElement(Footer, null));
}

// Setting default values for the props of CoverLayout
CoverLayout.defaultProps = {
  header: "",
  title: "",
  description: "",
  color: "info",
  top: 20
};

// Typechecking props for the CoverLayout
CoverLayout.propTypes = {
  color: PropTypes.oneOf(["primary", "secondary", "info", "success", "warning", "error", "dark", "light"]),
  header: PropTypes.node,
  title: PropTypes.string,
  description: PropTypes.string,
  image: PropTypes.string.isRequired,
  top: PropTypes.number,
  children: PropTypes.node.isRequired
};
export default CoverLayout;