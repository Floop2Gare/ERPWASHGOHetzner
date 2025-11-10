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
  }, "\u0627\u0644\u0639\u0645\u0644 \u0645\u0639 \u0627\u0644\u0635\u0648\u0627\u0631\u064A\u062E")), /*#__PURE__*/React.createElement(SoftBox, {
    mb: 2
  }, /*#__PURE__*/React.createElement(SoftTypography, {
    variant: "body2",
    color: "white",
    fontWeight: "bold"
  }, "\u062A\u0643\u0648\u064A\u0646 \u0627\u0644\u062B\u0631\u0648\u0629 \u0647\u0648 \u0644\u0639\u0628\u0629 \u062A\u0637\u0648\u0631\u064A \u062D\u062F\u064A\u062B\u0629 \u0630\u0627\u062A \u062D\u0635\u064A\u0644\u0629 \u0625\u064A\u062C\u0627\u0628\u064A\u0629. \u0627\u0644\u0623\u0645\u0631 \u0643\u0644\u0647 \u064A\u062A\u0639\u0644\u0642 \u0628\u0645\u0646 \u064A\u063A\u062A\u0646\u0645 \u0627\u0644\u0641\u0631\u0635\u0629 \u0623\u0648\u0644\u0627\u064B \u0647\u0630\u0647 \u0628\u0637\u0627\u0642\u0629 \u0628\u0633\u064A\u0637\u0629.")), /*#__PURE__*/React.createElement(SoftTypography, {
    component: "a",
    href: "#",
    variant: "button",
    color: "white",
    fontWeight: "bold",
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
  }, "\u0627\u0642\u0631\u0623 \u0627\u0644\u0645\u0633\u062A\u0646\u062F\u0627\u062A", /*#__PURE__*/React.createElement(Icon, {
    sx: {
      fontWeight: "bold"
    }
  }, "arrow_backward")))));
}
export default WorkWithTheRockets;