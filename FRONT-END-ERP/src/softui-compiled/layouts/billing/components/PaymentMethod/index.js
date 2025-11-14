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
import Tooltip from "@mui/material/Tooltip";

// Soft UI Dashboard React components
import SoftBox from "components/SoftBox";
import SoftTypography from "components/SoftTypography";
import SoftButton from "components/SoftButton";

// Soft UI Dashboard React base styles
import borders from "assets/theme/base/borders";

// Images
import masterCardLogo from "assets/images/logos/mastercard.png";
import visaLogo from "assets/images/logos/visa.png";
function PaymentMethod() {
  const {
    borderWidth,
    borderColor
  } = borders;
  return /*#__PURE__*/React.createElement(Card, {
    id: "delete-account"
  }, /*#__PURE__*/React.createElement(SoftBox, {
    pt: 2,
    px: 2,
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center"
  }, /*#__PURE__*/React.createElement(SoftTypography, {
    variant: "h6",
    fontWeight: "medium"
  }, "Payment Method"), /*#__PURE__*/React.createElement(SoftButton, {
    variant: "gradient",
    color: "dark"
  }, /*#__PURE__*/React.createElement(Icon, {
    sx: {
      fontWeight: "bold"
    }
  }, "add"), "\xA0add new card")), /*#__PURE__*/React.createElement(SoftBox, {
    p: 2
  }, /*#__PURE__*/React.createElement(Grid, {
    container: true,
    spacing: 3
  }, /*#__PURE__*/React.createElement(Grid, {
    item: true,
    xs: 12,
    md: 6
  }, /*#__PURE__*/React.createElement(SoftBox, {
    border: `${borderWidth[1]} solid ${borderColor}`,
    borderRadius: "lg",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    p: 3
  }, /*#__PURE__*/React.createElement(SoftBox, {
    component: "img",
    src: masterCardLogo,
    alt: "master card",
    width: "10%",
    mr: 2
  }), /*#__PURE__*/React.createElement(SoftTypography, {
    variant: "h6",
    fontWeight: "medium"
  }, "****\xA0\xA0****\xA0\xA0****\xA0\xA07852"), /*#__PURE__*/React.createElement(SoftBox, {
    ml: "auto",
    lineHeight: 0
  }, /*#__PURE__*/React.createElement(Tooltip, {
    title: "Edit Card",
    placement: "top"
  }, /*#__PURE__*/React.createElement(Icon, {
    sx: {
      cursor: "pointer"
    },
    fontSize: "small"
  }, "edit"))))), /*#__PURE__*/React.createElement(Grid, {
    item: true,
    xs: 12,
    md: 6
  }, /*#__PURE__*/React.createElement(SoftBox, {
    border: `${borderWidth[1]} solid ${borderColor}`,
    borderRadius: "lg",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    p: 3
  }, /*#__PURE__*/React.createElement(SoftBox, {
    component: "img",
    src: visaLogo,
    alt: "master card",
    width: "10%",
    mr: 2
  }), /*#__PURE__*/React.createElement(SoftTypography, {
    variant: "h6",
    fontWeight: "medium"
  }, "****\xA0\xA0****\xA0\xA0****\xA0\xA05248"), /*#__PURE__*/React.createElement(SoftBox, {
    ml: "auto",
    lineHeight: 0
  }, /*#__PURE__*/React.createElement(Tooltip, {
    title: "Edit Card",
    placement: "top"
  }, /*#__PURE__*/React.createElement(Icon, {
    sx: {
      cursor: "pointer"
    },
    fontSize: "small"
  }, "edit"))))))));
}
export default PaymentMethod;