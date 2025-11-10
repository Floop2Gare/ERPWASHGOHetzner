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
import Tooltip from "@mui/material/Tooltip";

// Soft UI Dashboard React components
import SoftBox from "components/SoftBox";
import SoftTypography from "components/SoftTypography";
function Emails() {
  return /*#__PURE__*/React.createElement(Card, null, /*#__PURE__*/React.createElement(SoftBox, {
    display: "flex",
    justifyContent: "space-between",
    p: 3,
    lineHeight: 1
  }, /*#__PURE__*/React.createElement(SoftTypography, {
    variant: "body2",
    color: "text"
  }, "Emails (21)"), /*#__PURE__*/React.createElement(Tooltip, {
    title: "Check your emails",
    placement: "top"
  }, /*#__PURE__*/React.createElement(SoftBox, {
    component: "a",
    href: "#"
  }, /*#__PURE__*/React.createElement(SoftTypography, {
    variant: "body2"
  }, "Check")))));
}
export default Emails;