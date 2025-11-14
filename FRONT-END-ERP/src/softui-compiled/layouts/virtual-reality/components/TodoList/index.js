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
import Divider from "@mui/material/Divider";
import Icon from "@mui/material/Icon";
import Tooltip from "@mui/material/Tooltip";

// Soft UI Dashboard React components
import SoftBox from "components/SoftBox";
import SoftTypography from "components/SoftTypography";
function TodoList() {
  return /*#__PURE__*/React.createElement(Card, {
    sx: {
      height: "100%"
    }
  }, /*#__PURE__*/React.createElement(SoftBox, {
    p: 3
  }, /*#__PURE__*/React.createElement(SoftBox, {
    display: "flex",
    lineHeight: 1
  }, /*#__PURE__*/React.createElement(SoftBox, {
    mr: 2
  }, /*#__PURE__*/React.createElement(SoftTypography, {
    variant: "h6",
    fontWeight: "medium"
  }, "08:00")), /*#__PURE__*/React.createElement(SoftBox, null, /*#__PURE__*/React.createElement(SoftTypography, {
    variant: "h6",
    fontWeight: "medium"
  }, "Synk up with Mark"), /*#__PURE__*/React.createElement(SoftTypography, {
    variant: "button",
    fontWeight: "regular",
    color: "secondary"
  }, "Hangouts"))), /*#__PURE__*/React.createElement(Divider, null), /*#__PURE__*/React.createElement(SoftBox, {
    display: "flex",
    lineHeight: 0
  }, /*#__PURE__*/React.createElement(SoftBox, {
    mr: 2
  }, /*#__PURE__*/React.createElement(SoftTypography, {
    variant: "h6",
    fontWeight: "medium"
  }, "09:30")), /*#__PURE__*/React.createElement(SoftBox, null, /*#__PURE__*/React.createElement(SoftTypography, {
    variant: "h6",
    fontWeight: "medium"
  }, "Gym"), /*#__PURE__*/React.createElement(SoftTypography, {
    variant: "button",
    fontWeight: "regular",
    color: "secondary"
  }, "World Class"))), /*#__PURE__*/React.createElement(Divider, null), /*#__PURE__*/React.createElement(SoftBox, {
    display: "flex",
    lineHeight: 1
  }, /*#__PURE__*/React.createElement(SoftBox, {
    mr: 2
  }, /*#__PURE__*/React.createElement(SoftTypography, {
    variant: "h6",
    fontWeight: "medium"
  }, "11:00")), /*#__PURE__*/React.createElement(SoftBox, null, /*#__PURE__*/React.createElement(SoftTypography, {
    variant: "h6",
    fontWeight: "medium"
  }, "Design Review"), /*#__PURE__*/React.createElement(SoftTypography, {
    variant: "button",
    fontWeight: "regular",
    color: "secondary"
  }, "Zoom")))), /*#__PURE__*/React.createElement(SoftBox, {
    bgColor: "grey-100",
    mt: "auto"
  }, /*#__PURE__*/React.createElement(Tooltip, {
    title: "Show More",
    placement: "top",
    sx: {
      cursor: "pointer"
    }
  }, /*#__PURE__*/React.createElement(SoftBox, {
    textAlign: "center",
    py: 0.5,
    color: "info",
    lineHeight: 0
  }, /*#__PURE__*/React.createElement(Icon, {
    sx: {
      fontWeight: "bold"
    },
    color: "inherit",
    fontSize: "default"
  }, "keyboard_arrow_down")))));
}
export default TodoList;