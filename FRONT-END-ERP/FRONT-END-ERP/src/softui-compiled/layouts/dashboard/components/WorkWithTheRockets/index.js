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
import Icon from "@mui/material/Icon";

// Soft UI Dashboard React components
import SoftBox from "components/SoftBox";
import SoftTypography from "components/SoftTypography";

// Images
import ivancik from "assets/images/ivancik.jpg";
function WorkWithTheRockets() {
  return /*#__PURE__*/React.createElement(Card, {
    sx: {
      height: "100%"
    }
  }, /*#__PURE__*/React.createElement(SoftBox, {
    position: "relative",
    height: "100%",
    p: 2
  }, /*#__PURE__*/React.createElement(SoftBox, {
    display: "flex",
    flexDirection: "column",
    height: "100%",
    py: 2,
    px: 2,
    borderRadius: "lg",
    sx: {
      backgroundImage: ({
        functions: {
          linearGradient,
          rgba
        },
        palette: {
          gradients
        }
      }) => `${linearGradient(rgba(gradients.dark.main, 0.8), rgba(gradients.dark.state, 0.8))}, url(${ivancik})`,
      backgroundSize: "cover"
    }
  }, /*#__PURE__*/React.createElement(SoftBox, {
    mb: 3,
    pt: 1
  }, /*#__PURE__*/React.createElement(SoftTypography, {
    variant: "h5",
    color: "white",
    fontWeight: "bold"
  }, "Work with the rockets")), /*#__PURE__*/React.createElement(SoftBox, {
    mb: 2
  }, /*#__PURE__*/React.createElement(SoftTypography, {
    variant: "body2",
    color: "white"
  }, "Wealth creation is an evolutionarily recent positive-sum game. It is all about who take the opportunity first.")), /*#__PURE__*/React.createElement(SoftTypography, {
    component: "a",
    href: "#",
    variant: "button",
    color: "white",
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
  }, "arrow_forward")))));
}
export default WorkWithTheRockets;