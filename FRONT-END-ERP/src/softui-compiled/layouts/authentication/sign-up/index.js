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

import { useState } from "react";

// react-router-dom components
import { Link } from "react-router-dom";

// @mui material components
import Card from "@mui/material/Card";
import Checkbox from "@mui/material/Checkbox";

// Soft UI Dashboard React components
import SoftBox from "components/SoftBox";
import SoftTypography from "components/SoftTypography";
import SoftInput from "components/SoftInput";
import SoftButton from "components/SoftButton";

// Authentication layout components
import BasicLayout from "layouts/authentication/components/BasicLayout";
import Socials from "layouts/authentication/components/Socials";
import Separator from "layouts/authentication/components/Separator";

// Images
import curved6 from "assets/images/curved-images/curved14.jpg";
function SignUp() {
  const [agreement, setAgremment] = useState(true);
  const handleSetAgremment = () => setAgremment(!agreement);
  return /*#__PURE__*/React.createElement(BasicLayout, {
    title: "Welcome!",
    description: "Use these awesome forms to login or create new account in your project for free.",
    image: curved6
  }, /*#__PURE__*/React.createElement(Card, null, /*#__PURE__*/React.createElement(SoftBox, {
    p: 3,
    mb: 1,
    textAlign: "center"
  }, /*#__PURE__*/React.createElement(SoftTypography, {
    variant: "h5",
    fontWeight: "medium"
  }, "Register with")), /*#__PURE__*/React.createElement(SoftBox, {
    mb: 2
  }, /*#__PURE__*/React.createElement(Socials, null)), /*#__PURE__*/React.createElement(Separator, null), /*#__PURE__*/React.createElement(SoftBox, {
    pt: 2,
    pb: 3,
    px: 3
  }, /*#__PURE__*/React.createElement(SoftBox, {
    component: "form",
    role: "form"
  }, /*#__PURE__*/React.createElement(SoftBox, {
    mb: 2
  }, /*#__PURE__*/React.createElement(SoftInput, {
    placeholder: "Name"
  })), /*#__PURE__*/React.createElement(SoftBox, {
    mb: 2
  }, /*#__PURE__*/React.createElement(SoftInput, {
    type: "email",
    placeholder: "Email"
  })), /*#__PURE__*/React.createElement(SoftBox, {
    mb: 2
  }, /*#__PURE__*/React.createElement(SoftInput, {
    type: "password",
    placeholder: "Password"
  })), /*#__PURE__*/React.createElement(SoftBox, {
    display: "flex",
    alignItems: "center"
  }, /*#__PURE__*/React.createElement(Checkbox, {
    checked: agreement,
    onChange: handleSetAgremment
  }), /*#__PURE__*/React.createElement(SoftTypography, {
    variant: "button",
    fontWeight: "regular",
    onClick: handleSetAgremment,
    sx: {
      cursor: "poiner",
      userSelect: "none"
    }
  }, "\xA0\xA0I agree the\xA0"), /*#__PURE__*/React.createElement(SoftTypography, {
    component: "a",
    href: "#",
    variant: "button",
    fontWeight: "bold",
    textGradient: true
  }, "Terms and Conditions")), /*#__PURE__*/React.createElement(SoftBox, {
    mt: 4,
    mb: 1
  }, /*#__PURE__*/React.createElement(SoftButton, {
    variant: "gradient",
    color: "dark",
    fullWidth: true
  }, "sign up")), /*#__PURE__*/React.createElement(SoftBox, {
    mt: 3,
    textAlign: "center"
  }, /*#__PURE__*/React.createElement(SoftTypography, {
    variant: "button",
    color: "text",
    fontWeight: "regular"
  }, "Already have an account?\xA0", /*#__PURE__*/React.createElement(SoftTypography, {
    component: Link,
    to: "/authentication/sign-in",
    variant: "button",
    color: "dark",
    fontWeight: "bold",
    textGradient: true
  }, "Sign in")))))));
}
export default SignUp;