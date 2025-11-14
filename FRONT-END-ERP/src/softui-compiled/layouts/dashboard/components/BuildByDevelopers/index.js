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

// @mui material components
import Card from "@mui/material/Card";
import Grid from "@mui/material/Grid";
import Icon from "@mui/material/Icon";

// Soft UI Dashboard React components
import SoftBox from "components/SoftBox";
import SoftTypography from "components/SoftTypography";

// Images
import wavesWhite from "assets/images/shapes/waves-white.svg";
import rocketWhite from "assets/images/illustrations/rocket-white.png";
function BuildByDevelopers() {
  return /*#__PURE__*/React.createElement(Card, null, /*#__PURE__*/React.createElement(SoftBox, {
    p: 2
  }, /*#__PURE__*/React.createElement(Grid, {
    container: true,
    spacing: 3
  }, /*#__PURE__*/React.createElement(Grid, {
    item: true,
    xs: 12,
    lg: 6
  }, /*#__PURE__*/React.createElement(SoftBox, {
    display: "flex",
    flexDirection: "column",
    height: "100%"
  }, /*#__PURE__*/React.createElement(SoftBox, {
    pt: 1,
    mb: 0.5
  }, /*#__PURE__*/React.createElement(SoftTypography, {
    variant: "body2",
    color: "text",
    fontWeight: "medium"
  }, "Build by developers")), /*#__PURE__*/React.createElement(SoftTypography, {
    variant: "h5",
    fontWeight: "bold",
    gutterBottom: true
  }, "Soft UI Dashboard"), /*#__PURE__*/React.createElement(SoftBox, {
    mb: 6
  }, /*#__PURE__*/React.createElement(SoftTypography, {
    variant: "body2",
    color: "text"
  }, "From colors, cards, typography to complex elements, you will find the full documentation.")), /*#__PURE__*/React.createElement(SoftTypography, {
    component: "a",
    href: "#",
    variant: "button",
    color: "text",
    fontWeight: "medium",
    sx: {
      mt: "auto",
      mr: "auto",
      display: "inline-flex",
      alignItems: "center",
      cursor: "pointer",
      "& .material-icons-round": {
        fontSize: "1.125rem",
        transform: `translate(2px, -0.5px)`,
        transition: "transform 0.2s cubic-bezier(0.34,1.61,0.7,1.3)"
      },
      "&:hover .material-icons-round, &:focus  .material-icons-round": {
        transform: `translate(6px, -0.5px)`
      }
    }
  }, "Read More", /*#__PURE__*/React.createElement(Icon, {
    sx: {
      fontWeight: "bold"
    }
  }, "arrow_forward")))), /*#__PURE__*/React.createElement(Grid, {
    item: true,
    xs: 12,
    lg: 5,
    sx: {
      position: "relative",
      ml: "auto"
    }
  }, /*#__PURE__*/React.createElement(SoftBox, {
    height: "100%",
    display: "grid",
    justifyContent: "center",
    alignItems: "center",
    bgColor: "info",
    borderRadius: "lg",
    variant: "gradient"
  }, /*#__PURE__*/React.createElement(SoftBox, {
    component: "img",
    src: wavesWhite,
    alt: "waves",
    display: "block",
    position: "absolute",
    left: 0,
    width: "100%",
    height: "100%"
  }), /*#__PURE__*/React.createElement(SoftBox, {
    component: "img",
    src: rocketWhite,
    alt: "rocket",
    width: "100%",
    pt: 3
  }))))));
}
export default BuildByDevelopers;