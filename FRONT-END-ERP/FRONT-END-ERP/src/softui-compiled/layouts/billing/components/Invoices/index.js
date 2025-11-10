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

// Soft UI Dashboard React components
import SoftBox from "components/SoftBox";
import SoftTypography from "components/SoftTypography";
import SoftButton from "components/SoftButton";

// Billing page components
import Invoice from "layouts/billing/components/Invoice";
function Invoices() {
  return /*#__PURE__*/React.createElement(Card, {
    id: "delete-account",
    sx: {
      height: "100%"
    }
  }, /*#__PURE__*/React.createElement(SoftBox, {
    pt: 2,
    px: 2,
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center"
  }, /*#__PURE__*/React.createElement(SoftTypography, {
    variant: "h6",
    fontWeight: "medium"
  }, "Invoices"), /*#__PURE__*/React.createElement(SoftButton, {
    variant: "outlined",
    color: "info",
    size: "small"
  }, "view all")), /*#__PURE__*/React.createElement(SoftBox, {
    p: 2
  }, /*#__PURE__*/React.createElement(SoftBox, {
    component: "ul",
    display: "flex",
    flexDirection: "column",
    p: 0,
    m: 0
  }, /*#__PURE__*/React.createElement(Invoice, {
    date: "March, 01, 2020",
    id: "#MS-415646",
    price: "$180"
  }), /*#__PURE__*/React.createElement(Invoice, {
    date: "February, 10, 2021",
    id: "#RV-126749",
    price: "$250"
  }), /*#__PURE__*/React.createElement(Invoice, {
    date: "April, 05, 2020",
    id: "#QW-103578",
    price: "$120"
  }), /*#__PURE__*/React.createElement(Invoice, {
    date: "June, 25, 2019",
    id: "#MS-415646",
    price: "$180"
  }), /*#__PURE__*/React.createElement(Invoice, {
    date: "March, 01, 2019",
    id: "#AR-803481",
    price: "$300",
    noGutter: true
  }))));
}
export default Invoices;