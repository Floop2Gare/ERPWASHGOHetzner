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

// @mui material components
import Card from "@mui/material/Card";
import Switch from "@mui/material/Switch";

// Soft UI Dashboard React components
import SoftBox from "components/SoftBox";
import SoftTypography from "components/SoftTypography";
function PlatformSettings() {
  const [followsMe, setFollowsMe] = useState(true);
  const [answersPost, setAnswersPost] = useState(false);
  const [mentionsMe, setMentionsMe] = useState(true);
  const [newLaunches, setNewLaunches] = useState(false);
  const [productUpdate, setProductUpdate] = useState(true);
  const [newsletter, setNewsletter] = useState(true);
  return /*#__PURE__*/React.createElement(Card, null, /*#__PURE__*/React.createElement(SoftBox, {
    pt: 2,
    px: 2
  }, /*#__PURE__*/React.createElement(SoftTypography, {
    variant: "h6",
    fontWeight: "medium",
    textTransform: "capitalize"
  }, "platform settings")), /*#__PURE__*/React.createElement(SoftBox, {
    pt: 1.5,
    pb: 2,
    px: 2,
    lineHeight: 1.25
  }, /*#__PURE__*/React.createElement(SoftTypography, {
    variant: "caption",
    fontWeight: "bold",
    color: "text",
    textTransform: "uppercase"
  }, "account"), /*#__PURE__*/React.createElement(SoftBox, {
    display: "flex",
    py: 1,
    mb: 0.25
  }, /*#__PURE__*/React.createElement(SoftBox, {
    mt: 0.25
  }, /*#__PURE__*/React.createElement(Switch, {
    checked: followsMe,
    onChange: () => setFollowsMe(!followsMe)
  })), /*#__PURE__*/React.createElement(SoftBox, {
    width: "80%",
    ml: 2
  }, /*#__PURE__*/React.createElement(SoftTypography, {
    variant: "button",
    fontWeight: "regular",
    color: "text"
  }, "Email me when someone follows me"))), /*#__PURE__*/React.createElement(SoftBox, {
    display: "flex",
    py: 1,
    mb: 0.25
  }, /*#__PURE__*/React.createElement(SoftBox, {
    mt: 0.25
  }, /*#__PURE__*/React.createElement(Switch, {
    checked: answersPost,
    onChange: () => setAnswersPost(!answersPost)
  })), /*#__PURE__*/React.createElement(SoftBox, {
    width: "80%",
    ml: 2
  }, /*#__PURE__*/React.createElement(SoftTypography, {
    variant: "button",
    fontWeight: "regular",
    color: "text"
  }, "Email me when someone answers on my post"))), /*#__PURE__*/React.createElement(SoftBox, {
    display: "flex",
    py: 1,
    mb: 0.25
  }, /*#__PURE__*/React.createElement(SoftBox, {
    mt: 0.25
  }, /*#__PURE__*/React.createElement(Switch, {
    checked: mentionsMe,
    onChange: () => setMentionsMe(!mentionsMe)
  })), /*#__PURE__*/React.createElement(SoftBox, {
    width: "80%",
    ml: 2
  }, /*#__PURE__*/React.createElement(SoftTypography, {
    variant: "button",
    fontWeight: "regular",
    color: "text"
  }, "Email me when someone mentions me"))), /*#__PURE__*/React.createElement(SoftBox, {
    mt: 3
  }, /*#__PURE__*/React.createElement(SoftTypography, {
    variant: "caption",
    fontWeight: "bold",
    color: "text",
    textTransform: "uppercase"
  }, "application")), /*#__PURE__*/React.createElement(SoftBox, {
    display: "flex",
    py: 1,
    mb: 0.25
  }, /*#__PURE__*/React.createElement(SoftBox, {
    mt: 0.25
  }, /*#__PURE__*/React.createElement(Switch, {
    checked: newLaunches,
    onChange: () => setNewLaunches(!newLaunches)
  })), /*#__PURE__*/React.createElement(SoftBox, {
    width: "80%",
    ml: 2
  }, /*#__PURE__*/React.createElement(SoftTypography, {
    variant: "button",
    fontWeight: "regular",
    color: "text"
  }, "New launches and projects"))), /*#__PURE__*/React.createElement(SoftBox, {
    display: "flex",
    py: 1,
    mb: 0.25
  }, /*#__PURE__*/React.createElement(SoftBox, {
    mt: 0.25
  }, /*#__PURE__*/React.createElement(Switch, {
    checked: productUpdate,
    onChange: () => setProductUpdate(!productUpdate)
  })), /*#__PURE__*/React.createElement(SoftBox, {
    width: "80%",
    ml: 2
  }, /*#__PURE__*/React.createElement(SoftTypography, {
    variant: "button",
    fontWeight: "regular",
    color: "text"
  }, "Monthly product updates"))), /*#__PURE__*/React.createElement(SoftBox, {
    display: "flex",
    py: 1,
    mb: 0.25
  }, /*#__PURE__*/React.createElement(SoftBox, {
    mt: 0.25
  }, /*#__PURE__*/React.createElement(Switch, {
    checked: newsletter,
    onChange: () => setNewsletter(!newsletter)
  })), /*#__PURE__*/React.createElement(SoftBox, {
    width: "80%",
    ml: 2
  }, /*#__PURE__*/React.createElement(SoftTypography, {
    variant: "button",
    fontWeight: "regular",
    color: "text"
  }, "Subscribe to newsletter")))));
}
export default PlatformSettings;