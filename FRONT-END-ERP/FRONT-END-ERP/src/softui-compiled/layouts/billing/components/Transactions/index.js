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
// import Divider from "@mui/material/Divider";
import Icon from "@mui/material/Icon";

// Soft UI Dashboard React components
import SoftBox from "components/SoftBox";
import SoftTypography from "components/SoftTypography";

// Billing page components
import Transaction from "layouts/billing/components/Transaction";
function Transactions() {
  return /*#__PURE__*/React.createElement(Card, {
    sx: {
      height: "100%"
    }
  }, /*#__PURE__*/React.createElement(SoftBox, {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    pt: 3,
    px: 2
  }, /*#__PURE__*/React.createElement(SoftTypography, {
    variant: "h6",
    fontWeight: "medium",
    textTransform: "capitalize"
  }, "Your Transaction's"), /*#__PURE__*/React.createElement(SoftBox, {
    display: "flex",
    alignItems: "flex-start"
  }, /*#__PURE__*/React.createElement(SoftBox, {
    color: "text",
    mr: 0.5,
    lineHeight: 0
  }, /*#__PURE__*/React.createElement(Icon, {
    color: "inherit",
    fontSize: "small"
  }, "date_range")), /*#__PURE__*/React.createElement(SoftTypography, {
    variant: "button",
    color: "text",
    fontWeight: "regular"
  }, "23 - 30 March 2020"))), /*#__PURE__*/React.createElement(SoftBox, {
    pt: 3,
    pb: 2,
    px: 2
  }, /*#__PURE__*/React.createElement(SoftBox, {
    mb: 2
  }, /*#__PURE__*/React.createElement(SoftTypography, {
    variant: "caption",
    color: "text",
    fontWeight: "bold",
    textTransform: "uppercase"
  }, "newest")), /*#__PURE__*/React.createElement(SoftBox, {
    component: "ul",
    display: "flex",
    flexDirection: "column",
    p: 0,
    m: 0,
    sx: {
      listStyle: "none"
    }
  }, /*#__PURE__*/React.createElement(Transaction, {
    color: "error",
    icon: "arrow_downward",
    name: "Netflix",
    description: "27 March 2020, at 12:30 PM",
    value: "- $ 2,500"
  }), /*#__PURE__*/React.createElement(Transaction, {
    color: "success",
    icon: "arrow_upward",
    name: "Apple",
    description: "27 March 2020, at 04:30 AM",
    value: "+ $ 2,000"
  })), /*#__PURE__*/React.createElement(SoftBox, {
    mt: 1,
    mb: 2
  }, /*#__PURE__*/React.createElement(SoftTypography, {
    variant: "caption",
    color: "text",
    fontWeight: "bold",
    textTransform: "uppercase"
  }, "yesterday")), /*#__PURE__*/React.createElement(SoftBox, {
    component: "ul",
    display: "flex",
    flexDirection: "column",
    p: 0,
    m: 0,
    sx: {
      listStyle: "none"
    }
  }, /*#__PURE__*/React.createElement(Transaction, {
    color: "success",
    icon: "arrow_upward",
    name: "Stripe",
    description: "26 March 2020, at 13:45 PM",
    value: "+ $ 750"
  }), /*#__PURE__*/React.createElement(Transaction, {
    color: "success",
    icon: "arrow_upward",
    name: "HubSpot",
    description: "26 March 2020, at 12:30 PM",
    value: "+ $ 1,000"
  }), /*#__PURE__*/React.createElement(Transaction, {
    color: "success",
    icon: "arrow_upward",
    name: "Creative Tim",
    description: "26 March 2020, at 08:30 AM",
    value: "+ $ 2,500"
  }), /*#__PURE__*/React.createElement(Transaction, {
    color: "dark",
    icon: "priority_high",
    name: "Webflow",
    description: "26 March 2020, at 05:00 AM",
    value: "Pending"
  }))));
}
export default Transactions;