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

// Soft UI Dashboard React examples
import TimelineItem from "examples/Timeline/TimelineItem";
function OrdersOverview() {
  return /*#__PURE__*/React.createElement(Card, {
    className: "h-100"
  }, /*#__PURE__*/React.createElement(SoftBox, {
    pt: 3,
    px: 3
  }, /*#__PURE__*/React.createElement(SoftTypography, {
    variant: "h6",
    fontWeight: "medium"
  }, "Orders overview"), /*#__PURE__*/React.createElement(SoftBox, {
    mt: 1,
    mb: 2
  }, /*#__PURE__*/React.createElement(SoftTypography, {
    variant: "button",
    color: "text",
    fontWeight: "regular"
  }, /*#__PURE__*/React.createElement(SoftTypography, {
    display: "inline",
    variant: "body2",
    verticalAlign: "middle"
  }, /*#__PURE__*/React.createElement(Icon, {
    sx: {
      fontWeight: "bold",
      color: ({
        palette: {
          success
        }
      }) => success.main
    }
  }, "arrow_upward")), "\xA0", /*#__PURE__*/React.createElement(SoftTypography, {
    variant: "button",
    color: "text",
    fontWeight: "medium"
  }, "24%"), " ", "this month"))), /*#__PURE__*/React.createElement(SoftBox, {
    p: 2
  }, /*#__PURE__*/React.createElement(TimelineItem, {
    color: "success",
    icon: "notifications",
    title: "$2400, Design changes",
    dateTime: "22 DEC 7:20 PM"
  }), /*#__PURE__*/React.createElement(TimelineItem, {
    color: "error",
    icon: "inventory_2",
    title: "New order #1832412",
    dateTime: "21 DEC 11 PM"
  }), /*#__PURE__*/React.createElement(TimelineItem, {
    color: "info",
    icon: "shopping_cart",
    title: "Server payments for April",
    dateTime: "21 DEC 9:34 PM"
  }), /*#__PURE__*/React.createElement(TimelineItem, {
    color: "warning",
    icon: "payment",
    title: "New card added for order #4395133",
    dateTime: "20 DEC 2:20 AM"
  }), /*#__PURE__*/React.createElement(TimelineItem, {
    color: "primary",
    icon: "vpn_key",
    title: "New card added for order #4395133",
    dateTime: "18 DEC 4:54 AM"
  }), /*#__PURE__*/React.createElement(TimelineItem, {
    color: "dark",
    icon: "paid",
    title: "New order #9583120",
    dateTime: "17 DEC"
  })));
}
export default OrdersOverview;