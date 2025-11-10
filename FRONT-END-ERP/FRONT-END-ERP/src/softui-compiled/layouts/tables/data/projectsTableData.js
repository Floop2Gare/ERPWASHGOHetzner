/* eslint-disable react/prop-types */
// @mui material components
import Icon from "@mui/material/Icon";

// Soft UI Dashboard React components
import SoftBox from "components/SoftBox";
import SoftTypography from "components/SoftTypography";
import SoftProgress from "components/SoftProgress";

// Images
import logoSpotify from "assets/images/small-logos/logo-spotify.svg";
import logoInvesion from "assets/images/small-logos/logo-invision.svg";
import logoJira from "assets/images/small-logos/logo-jira.svg";
import logoSlack from "assets/images/small-logos/logo-slack.svg";
import logoWebDev from "assets/images/small-logos/logo-webdev.svg";
import logoXD from "assets/images/small-logos/logo-xd.svg";
function Completion({
  value,
  color
}) {
  return /*#__PURE__*/React.createElement(SoftBox, {
    display: "flex",
    alignItems: "center"
  }, /*#__PURE__*/React.createElement(SoftTypography, {
    variant: "caption",
    color: "text",
    fontWeight: "medium"
  }, value, "%\xA0"), /*#__PURE__*/React.createElement(SoftBox, {
    width: "8rem"
  }, /*#__PURE__*/React.createElement(SoftProgress, {
    value: value,
    color: color,
    variant: "gradient",
    label: false
  })));
}
const action = /*#__PURE__*/React.createElement(Icon, {
  sx: {
    cursor: "pointer",
    fontWeight: "bold"
  },
  fontSize: "small"
}, "more_vert");
const projectsTableData = {
  columns: [{
    name: "project",
    align: "left"
  }, {
    name: "budget",
    align: "left"
  }, {
    name: "status",
    align: "left"
  }, {
    name: "completion",
    align: "center"
  }, {
    name: "action",
    align: "center"
  }],
  rows: [{
    project: [logoSpotify, "Spotift"],
    budget: /*#__PURE__*/React.createElement(SoftTypography, {
      variant: "button",
      color: "text",
      fontWeight: "medium"
    }, "$2,500"),
    status: /*#__PURE__*/React.createElement(SoftTypography, {
      variant: "caption",
      color: "text",
      fontWeight: "medium"
    }, "working"),
    completion: /*#__PURE__*/React.createElement(Completion, {
      value: 60,
      color: "info"
    }),
    action
  }, {
    project: [logoInvesion, "Invesion"],
    budget: /*#__PURE__*/React.createElement(SoftTypography, {
      variant: "button",
      color: "text",
      fontWeight: "medium"
    }, "$5,000"),
    status: /*#__PURE__*/React.createElement(SoftTypography, {
      variant: "caption",
      color: "text",
      fontWeight: "medium"
    }, "done"),
    completion: /*#__PURE__*/React.createElement(Completion, {
      value: 100,
      color: "success"
    }),
    action
  }, {
    project: [logoJira, "Jira"],
    budget: /*#__PURE__*/React.createElement(SoftTypography, {
      variant: "button",
      color: "text",
      fontWeight: "medium"
    }, "$3,400"),
    status: /*#__PURE__*/React.createElement(SoftTypography, {
      variant: "caption",
      color: "text",
      fontWeight: "medium"
    }, "canceled"),
    completion: /*#__PURE__*/React.createElement(Completion, {
      value: 30,
      color: "error"
    }),
    action
  }, {
    project: [logoSlack, "Slack"],
    budget: /*#__PURE__*/React.createElement(SoftTypography, {
      variant: "button",
      color: "text",
      fontWeight: "medium"
    }, "$1,400"),
    status: /*#__PURE__*/React.createElement(SoftTypography, {
      variant: "caption",
      color: "text",
      fontWeight: "medium"
    }, "canceled"),
    completion: /*#__PURE__*/React.createElement(Completion, {
      value: 0,
      color: "error"
    }),
    action
  }, {
    project: [logoWebDev, "Webdev"],
    budget: /*#__PURE__*/React.createElement(SoftTypography, {
      variant: "button",
      color: "text",
      fontWeight: "medium"
    }, "$14,000"),
    status: /*#__PURE__*/React.createElement(SoftTypography, {
      variant: "caption",
      color: "text",
      fontWeight: "medium"
    }, "working"),
    completion: /*#__PURE__*/React.createElement(Completion, {
      value: 80,
      color: "info"
    }),
    action
  }, {
    project: [logoXD, "Adobe XD"],
    budget: /*#__PURE__*/React.createElement(SoftTypography, {
      variant: "button",
      color: "text",
      fontWeight: "medium"
    }, "$2,300"),
    status: /*#__PURE__*/React.createElement(SoftTypography, {
      variant: "caption",
      color: "text",
      fontWeight: "medium"
    }, "done"),
    completion: /*#__PURE__*/React.createElement(Completion, {
      value: 100,
      color: "success"
    }),
    action
  }]
};
export default projectsTableData;