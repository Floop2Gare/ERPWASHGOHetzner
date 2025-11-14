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

// prop-types is a library for typechecking of props
import PropTypes from "prop-types";

// @mui material components
import Icon from "@mui/material/Icon";

// Soft UI Dashboard React components
import SoftBox from "components/SoftBox";
import SoftTypography from "components/SoftTypography";
import SoftButton from "components/SoftButton";
function Bill({
  name,
  company,
  email,
  vat,
  noGutter
}) {
  return /*#__PURE__*/React.createElement(SoftBox, {
    component: "li",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    bgColor: "grey-100",
    borderRadius: "lg",
    p: 3,
    mb: noGutter ? 0 : 1,
    mt: 2
  }, /*#__PURE__*/React.createElement(SoftBox, {
    width: "100%",
    display: "flex",
    flexDirection: "column"
  }, /*#__PURE__*/React.createElement(SoftBox, {
    display: "flex",
    justifyContent: "space-between",
    alignItems: {
      xs: "flex-start",
      sm: "center"
    },
    flexDirection: {
      xs: "column",
      sm: "row"
    },
    mb: 2
  }, /*#__PURE__*/React.createElement(SoftTypography, {
    variant: "button",
    fontWeight: "medium",
    textTransform: "capitalize"
  }, name), /*#__PURE__*/React.createElement(SoftBox, {
    display: "flex",
    alignItems: "center",
    mt: {
      xs: 2,
      sm: 0
    },
    ml: {
      xs: -1.5,
      sm: 0
    }
  }, /*#__PURE__*/React.createElement(SoftBox, {
    mr: 1
  }, /*#__PURE__*/React.createElement(SoftButton, {
    variant: "text",
    color: "error"
  }, /*#__PURE__*/React.createElement(Icon, null, "delete"), "\xA0delete")), /*#__PURE__*/React.createElement(SoftButton, {
    variant: "text",
    color: "dark"
  }, /*#__PURE__*/React.createElement(Icon, null, "edit"), "\xA0edit"))), /*#__PURE__*/React.createElement(SoftBox, {
    mb: 1,
    lineHeight: 0
  }, /*#__PURE__*/React.createElement(SoftTypography, {
    variant: "caption",
    color: "text"
  }, "Company Name:\xA0\xA0\xA0", /*#__PURE__*/React.createElement(SoftTypography, {
    variant: "caption",
    fontWeight: "medium",
    textTransform: "capitalize"
  }, company))), /*#__PURE__*/React.createElement(SoftBox, {
    mb: 1,
    lineHeight: 0
  }, /*#__PURE__*/React.createElement(SoftTypography, {
    variant: "caption",
    color: "text"
  }, "Email Address:\xA0\xA0\xA0", /*#__PURE__*/React.createElement(SoftTypography, {
    variant: "caption",
    fontWeight: "medium"
  }, email))), /*#__PURE__*/React.createElement(SoftTypography, {
    variant: "caption",
    color: "text"
  }, "VAT Number:\xA0\xA0\xA0", /*#__PURE__*/React.createElement(SoftTypography, {
    variant: "caption",
    fontWeight: "medium"
  }, vat))));
}

// Setting default values for the props of Bill
Bill.defaultProps = {
  noGutter: false
};

// Typechecking props for the Bill
Bill.propTypes = {
  name: PropTypes.string.isRequired,
  company: PropTypes.string.isRequired,
  email: PropTypes.string.isRequired,
  vat: PropTypes.string.isRequired,
  noGutter: PropTypes.bool
};
export default Bill;