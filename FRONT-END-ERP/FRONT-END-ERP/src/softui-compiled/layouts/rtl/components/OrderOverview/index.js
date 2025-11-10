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
    title: "$2400, \u062A\u063A\u064A\u064A\u0631\u0627\u062A \u0641\u064A \u0627\u0644\u062A\u0635\u0645\u064A\u0645",
    dateTime: "22 \u062F\u064A\u0633\u0645\u0628\u0631 7:20 \u0645\u0633\u0627\u0621\u064B"
  }), /*#__PURE__*/React.createElement(TimelineItem, {
    color: "error",
    icon: "inventory_2",
    title: "\u0637\u0644\u0628 \u062C\u062F\u064A\u062F # 1832412",
    dateTime: "21 \u062F\u064A\u0633\u0645\u0628\u0631 11 \u0645"
  }), /*#__PURE__*/React.createElement(TimelineItem, {
    color: "info",
    icon: "shopping_cart",
    title: "\u0645\u062F\u0641\u0648\u0639\u0627\u062A \u0627\u0644\u062E\u0627\u062F\u0645 \u0644\u0634\u0647\u0631 \u0623\u0628\u0631\u064A\u0644",
    dateTime: "21 \u062F\u064A\u0633\u0645\u0628\u0631 9:34 \u0645\u0633\u0627\u0621\u064B"
  }), /*#__PURE__*/React.createElement(TimelineItem, {
    color: "warning",
    icon: "payment",
    title: "\u062A\u0645\u062A \u0625\u0636\u0627\u0641\u0629 \u0628\u0637\u0627\u0642\u0629 \u062C\u062F\u064A\u062F\u0629 \u0644\u0644\u0623\u0645\u0631 \u0631\u0642\u0645 4395133",
    dateTime: "20 \u062F\u064A\u0633\u0645\u0628\u0631 2:20 \u0635\u0628\u0627\u062D\u064B\u0627"
  }), /*#__PURE__*/React.createElement(TimelineItem, {
    color: "primary",
    icon: "vpn_key",
    title: "\u0641\u062A\u062D \u0627\u0644\u062D\u0632\u0645 \u0645\u0646 \u0623\u062C\u0644 \u0627\u0644\u062A\u0637\u0648\u064A\u0631",
    dateTime: "18 \u062F\u064A\u0633\u0645\u0628\u0631 \u060C 4:54 \u0635\u0628\u0627\u062D\u064B\u0627"
  }), /*#__PURE__*/React.createElement(TimelineItem, {
    color: "dark",
    icon: "paid",
    title: "\u0637\u0644\u0628 \u062C\u062F\u064A\u062F # 9583120",
    dateTime: "17 \u062F\u064A\u0633\u0645\u0628\u0631"
  })));
}
export default OrdersOverview;