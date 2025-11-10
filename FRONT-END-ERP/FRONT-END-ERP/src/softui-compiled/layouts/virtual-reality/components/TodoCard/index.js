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
import Tooltip from "@mui/material/Tooltip";

// Soft UI Dashboard React components
import SoftBox from "components/SoftBox";
import SoftTypography from "components/SoftTypography";
function TodoCard() {
  return /*#__PURE__*/React.createElement(Card, null, /*#__PURE__*/React.createElement(SoftBox, {
    bgColor: "dark",
    variant: "gradient"
  }, /*#__PURE__*/React.createElement(SoftBox, {
    p: 3
  }, /*#__PURE__*/React.createElement(SoftBox, {
    display: "flex",
    justifyContent: "space-between"
  }, /*#__PURE__*/React.createElement(SoftTypography, {
    variant: "h5",
    color: "white"
  }, "To Do"), /*#__PURE__*/React.createElement(SoftBox, {
    textAlign: "center",
    lineHeight: 1
  }, /*#__PURE__*/React.createElement(SoftTypography, {
    variant: "h1",
    color: "white",
    fontWeight: "bold"
  }, "7"), /*#__PURE__*/React.createElement(SoftTypography, {
    variant: "button",
    color: "white",
    fontWeight: "regular"
  }, "items"))), /*#__PURE__*/React.createElement(SoftTypography, {
    variant: "body2",
    color: "white",
    fontWeight: "regular"
  }, "Shopping"), /*#__PURE__*/React.createElement(SoftTypography, {
    variant: "body2",
    color: "white",
    fontWeight: "regular"
  }, "Meeting")), /*#__PURE__*/React.createElement(Tooltip, {
    title: "Show More",
    placement: "top",
    sx: {
      cursor: "pointer"
    }
  }, /*#__PURE__*/React.createElement(SoftBox, {
    textAlign: "center",
    color: "white",
    py: 0.5,
    lineHeight: 0
  }, /*#__PURE__*/React.createElement(Icon, {
    sx: {
      fontWeight: "bold"
    },
    color: "inherit",
    fontSize: "default"
  }, "keyboard_arrow_down")))));
}
export default TodoCard;