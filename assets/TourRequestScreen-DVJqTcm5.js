import{r as m,j as t,u as $,c as F}from"./index-DJTMSaIU.js";import{C as D,D as A}from"./CustomDropdown-C5EAlaue.js";import{N as W}from"./NotificationModal-CMhk9B5P.js";import{u as B}from"./formAutoSave-iZfeXlxb.js";import"./createLucideIcon-D3XSCUrN.js";import"./calendar-C-Fi1QuP.js";const G=({value:p,onChange:u,placeholder:l="Select your preferred time slot",label:f="Preferred Tour Time",labelHindi:S="टूरची प्राधान्य वेळ",error:v=null})=>{const[g,a]=m.useState(!1),[x,i]=m.useState(p?parseInt(p.split(":")[0]):9),[b,s]=m.useState(p?parseInt(p.split(":")[1].split(" ")[0]):0),[n,h]=m.useState(p?p.split(" ")[1]:"AM"),y=(o,j,w)=>{const M=o===0?12:o>12?o-12:o,I=j.toString().padStart(2,"0");return`${M}:${I} ${w}`},N=(o,j,w)=>{const M=y(o,j,w),I=o===23?0:o+1,H=y(I,j,o===11?w==="AM"?"PM":"AM":w);return`${M} - ${H}`},T=()=>{i(o=>o===8&&n==="PM"?9:o===11&&n==="AM"?(h("PM"),12):o===11&&n==="PM"?9:o===12&&n==="PM"?1:o===9?10:o+1)},k=()=>{i(o=>o===9&&n==="AM"?(h("PM"),9):o===9&&n==="PM"?8:o===12&&n==="PM"?(h("AM"),11):o===1&&n==="PM"?12:o-1)},C=()=>{s(o=>o===0?30:0)},O=()=>{s(o=>o===30?0:30)},d=()=>{n==="AM"?(h("PM"),i(12)):(h("AM"),i(9))},R=()=>{n==="PM"?(h("AM"),i(9)):(h("PM"),i(12))},P=()=>{const o=N(x,b,n);u(o),a(!1)},q=()=>{a(!0)},E=()=>{a(!1)},r=x===0?12:x>12?x-12:x,c=N(x,b,n);return t.jsxs("div",{className:"input-group",children:[t.jsx("label",{className:"membership-input-label",children:f}),t.jsx("div",{className:"marathi-text",children:S}),t.jsxs("div",{className:`custom-clock-input ${p?"clock-selected":""} ${v?"clock-error":""}`,onClick:q,children:[p?t.jsx("span",{className:"custom-clock-value",children:c}):t.jsx("span",{className:"custom-clock-placeholder",children:l}),t.jsx("span",{className:"custom-clock-chevron"})]}),v&&t.jsx("span",{className:"error-message",children:v}),g&&t.jsx("div",{className:"custom-time-modal-backdrop",onClick:E,children:t.jsxs("div",{className:"custom-time-modal",onClick:o=>o.stopPropagation(),children:[t.jsxs("div",{className:"custom-time-header",children:[t.jsx("h2",{className:"custom-time-title",children:"Select Tour Time"}),t.jsx("p",{className:"custom-time-subtitle",children:"Select your preferred 1-hour time slot"})]}),t.jsx("div",{className:"custom-time-body",children:t.jsxs("div",{className:"custom-time-picker",children:[t.jsxs("div",{className:"custom-time-labels-box",children:[t.jsx("div",{className:"custom-label-item",children:"Hour"}),t.jsx("div",{className:"custom-label-colon",children:":"}),t.jsx("div",{className:"custom-label-item",children:"Minute"}),t.jsx("div",{className:"custom-label-item",children:"Period"})]}),t.jsxs("div",{className:"custom-time-selectors",children:[t.jsx("div",{className:"custom-time-unit",children:t.jsxs("div",{className:"custom-unit-container",children:[t.jsx("button",{className:"custom-increment-btn",onClick:T,type:"button",children:t.jsx("div",{className:"custom-arrow-up"})}),t.jsx("div",{className:"custom-time-display",children:r.toString().padStart(2,"0")}),t.jsx("button",{className:"custom-decrement-btn",onClick:k,type:"button",children:t.jsx("div",{className:"custom-arrow-down"})})]})}),t.jsx("div",{className:"custom-time-colon",children:":"}),t.jsx("div",{className:"custom-time-unit",children:t.jsxs("div",{className:"custom-unit-container",children:[t.jsx("button",{className:"custom-increment-btn",onClick:C,type:"button",children:t.jsx("div",{className:"custom-arrow-up"})}),t.jsx("div",{className:"custom-time-display",children:b.toString().padStart(2,"0")}),t.jsx("button",{className:"custom-decrement-btn",onClick:O,type:"button",children:t.jsx("div",{className:"custom-arrow-down"})})]})}),t.jsx("div",{className:"custom-period-unit",children:t.jsxs("div",{className:"custom-period-container",children:[t.jsx("button",{className:"custom-period-increment-btn",onClick:d,type:"button",children:t.jsx("div",{className:"custom-arrow-up"})}),t.jsx("div",{className:"custom-period-display",children:n}),t.jsx("button",{className:"custom-period-decrement-btn",onClick:R,type:"button",children:t.jsx("div",{className:"custom-arrow-down"})})]})})]}),t.jsx("button",{className:"custom-time-confirm",onClick:P,type:"button",children:"Confirm Time"})]})})]})})]})},K=({isVisible:p=!1,saveTime:u=null,status:l="saved",onRestore:f=null,showRestoreOption:S=!1})=>{const[v,g]=m.useState(!1);m.useEffect(()=>{if(p){if(g(!0),l==="saved"){const b=setTimeout(()=>{g(!1)},3e3);return()=>clearTimeout(b)}}else g(!1)},[p,l]);const a=()=>{switch(l){case"saving":return t.jsx("svg",{className:"autosave-icon saving",width:"16",height:"16",viewBox:"0 0 24 24",fill:"none",children:t.jsx("circle",{cx:"12",cy:"12",r:"10",stroke:"currentColor",strokeWidth:"2",strokeDasharray:"32",strokeDashoffset:"32",children:t.jsx("animate",{attributeName:"stroke-dashoffset",dur:"1s",values:"32;0;32",repeatCount:"indefinite"})})});case"saved":return t.jsxs("svg",{className:"autosave-icon saved",width:"16",height:"16",viewBox:"0 0 24 24",fill:"none",stroke:"currentColor",strokeWidth:"2",children:[t.jsx("path",{d:"M22 11.08V12a10 10 0 1 1-5.93-9.14"}),t.jsx("polyline",{points:"22,4 12,14.01 9,11.01"})]});case"error":return t.jsxs("svg",{className:"autosave-icon error",width:"16",height:"16",viewBox:"0 0 24 24",fill:"none",stroke:"currentColor",strokeWidth:"2",children:[t.jsx("circle",{cx:"12",cy:"12",r:"10"}),t.jsx("line",{x1:"15",y1:"9",x2:"9",y2:"15"}),t.jsx("line",{x1:"9",y1:"9",x2:"15",y2:"15"})]});default:return null}},x=()=>{switch(l){case"saving":return"Saving...";case"saved":return u?`Saved at ${u.toLocaleTimeString()}`:"Saved";case"error":return"Save failed";default:return""}},i=b=>{const n=Math.floor((new Date-b)/(1e3*60));if(n<1)return"just now";if(n<60)return`${n} minute${n>1?"s":""} ago`;const h=Math.floor(n/60);return h<24?`${h} hour${h>1?"s":""} ago`:b.toLocaleDateString()};return!v&&!S?null:t.jsxs(t.Fragment,{children:[v&&t.jsxs("div",{className:`autosave-indicator ${l}`,children:[a(),t.jsx("span",{className:"autosave-text",children:x()})]}),S&&u&&f&&t.jsxs("div",{className:"autosave-restore-banner",children:[t.jsxs("div",{className:"restore-content",children:[t.jsx("div",{className:"restore-icon",children:t.jsxs("svg",{width:"20",height:"20",viewBox:"0 0 24 24",fill:"none",stroke:"currentColor",strokeWidth:"2",children:[t.jsx("polyline",{points:"1 4 1 10 7 10"}),t.jsx("path",{d:"M3.51 15a9 9 0 1 0 2.13-9.36L1 10"})]})}),t.jsxs("div",{className:"restore-text",children:[t.jsx("span",{className:"restore-main",children:"Restore unsaved changes?"}),t.jsxs("span",{className:"restore-time",children:["Last saved ",i(u)]})]})]}),t.jsxs("div",{className:"restore-actions",children:[t.jsx("button",{className:"restore-btn restore",onClick:f,children:"Restore"}),t.jsx("button",{className:"restore-btn dismiss",onClick:()=>{},children:"Dismiss"})]})]}),t.jsx("style",{jsx:!0,children:`
        .autosave-indicator {
          position: fixed;
          top: 20px;
          right: 20px;
          background: white;
          border-radius: 8px;
          padding: 8px 12px;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
          border: 1px solid #e5e7eb;
          display: flex;
          align-items: center;
          gap: 8px;
          z-index: 1000;
          animation: slideIn 0.3s ease-out;
        }

        @keyframes slideIn {
          from {
            opacity: 0;
            transform: translateX(100%);
          }
          to {
            opacity: 1;
            transform: translateX(0);
          }
        }

        .autosave-indicator.saving {
          border-color: #3b82f6;
        }

        .autosave-indicator.saved {
          border-color: #10b981;
        }

        .autosave-indicator.error {
          border-color: #ef4444;
        }

        .autosave-icon.saving {
          color: #3b82f6;
        }

        .autosave-icon.saved {
          color: #10b981;
        }

        .autosave-icon.error {
          color: #ef4444;
        }

        .autosave-text {
          font-size: 14px;
          color: #374151;
          font-weight: 500;
        }

        .autosave-restore-banner {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          background: #fef3c7;
          border-bottom: 1px solid #f59e0b;
          padding: 12px 20px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          z-index: 1001;
          animation: slideDown 0.3s ease-out;
        }

        @keyframes slideDown {
          from {
            opacity: 0;
            transform: translateY(-100%);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        .restore-content {
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .restore-icon {
          color: #f59e0b;
          flex-shrink: 0;
        }

        .restore-text {
          display: flex;
          flex-direction: column;
          gap: 2px;
        }

        .restore-main {
          font-weight: 600;
          color: #92400e;
          font-size: 14px;
        }

        .restore-time {
          font-size: 12px;
          color: #b45309;
        }

        .restore-actions {
          display: flex;
          gap: 8px;
        }

        .restore-btn {
          padding: 6px 12px;
          border-radius: 6px;
          font-size: 12px;
          font-weight: 500;
          cursor: pointer;
          border: 1px solid transparent;
          transition: all 0.15s ease;
        }

        .restore-btn.restore {
          background: #f59e0b;
          color: white;
          border-color: #f59e0b;
        }

        .restore-btn.restore:hover {
          background: #d97706;
          border-color: #d97706;
        }

        .restore-btn.dismiss {
          background: white;
          color: #92400e;
          border-color: #f59e0b;
        }

        .restore-btn.dismiss:hover {
          background: #fef3c7;
        }

        @media (max-width: 640px) {
          .autosave-indicator {
            top: 10px;
            right: 10px;
            left: 10px;
            justify-content: center;
          }

          .autosave-restore-banner {
            padding: 10px 16px;
            flex-direction: column;
            gap: 12px;
            align-items: stretch;
          }

          .restore-content {
            justify-content: center;
          }

          .restore-actions {
            justify-content: center;
          }
        }
      `})]})};function Q(){const p=$(),[u,l]=m.useState({isOpen:!1,type:"info",title:"",message:"",actions:[]}),[f,S]=m.useState("saved"),[v,g]=m.useState(!1),[a,x]=m.useState({fullName:"",email:"",phone:"",gender:"",tourDate:"",tourTime:"",educationalBackground:"",currentOccupation:"",jobTitle:"",examPreparation:"",examinationDate:"",howDidYouKnow:"",previousStudyRoomExperience:"",studyRoomComparison:"",startDate:"",preferredDate:"",preferredTime:"",groupSize:"1",interests:[],additionalRequests:""}),[i,b]=m.useState(!1),[s,n]=m.useState({}),[h,y]=m.useState(!1),[N,T]=m.useState(!1),{scheduleAutoSave:k,hasSavedData:C}=B("tour-request-form",a);m.useEffect(()=>{C()&&g(!0)},[C]),m.useEffect(()=>{Object.values(a).some(c=>typeof c=="string"?c.trim().length>0:!!c)&&k()},[a,k]);const O=r=>{x(c=>({...c,tourTime:r})),s.tourTime&&n(c=>({...c,tourTime:""}))},d=r=>{const{name:c,value:o}=r.target;x(j=>({...j,[c]:o})),s[c]&&n(j=>({...j,[c]:""}))},R=()=>{const r={};if(a.fullName.trim()||(r.fullName="Full name is required"),a.email.trim()?/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(a.email)||(r.email="Please enter a valid email address"):r.email="Email is required",!a.phone.trim())r.phone="Phone number is required";else{const c=/^(\+91)?[6-9]\d{9}$/,o=a.phone.replace(/\s+/g,"");c.test(o)||(r.phone="Please enter a valid 10-digit Indian mobile number")}if(a.gender||(r.gender="Gender is required"),!a.tourDate)r.tourDate="Tour date is required";else{const c=new Date(a.tourDate),o=new Date;o.setDate(o.getDate()+1),o.setHours(0,0,0,0),c<o&&(r.tourDate="Please select a future date (tomorrow or later)")}return a.tourTime||(r.tourTime="Tour time is required"),a.educationalBackground||(r.educationalBackground="Educational background is required"),a.currentOccupation||(r.currentOccupation="Current occupation is required"),a.currentOccupation&&a.currentOccupation!=="Unemployed"&&a.currentOccupation!=="Student"&&!a.jobTitle.trim()&&(r.jobTitle="Job title is required"),a.examPreparation||(r.examPreparation="Exam preparation is required"),a.examinationDate||(r.examinationDate="Examination date is required"),a.howDidYouKnow||(r.howDidYouKnow="This field is required"),a.previousStudyRoomExperience.trim()||(r.previousStudyRoomExperience="Previous study room experience is required"),a.studyRoomComparison.trim()||(r.studyRoomComparison="Study room comparison is required"),a.startDate||(r.startDate="Start date is required"),n(r),Object.keys(r).length===0},P=r=>{r.preventDefault(),R()&&y(!0)},q=async()=>{if(!N){l({isOpen:!0,type:"warning",title:"Terms and Conditions Required",message:"Please agree to the terms and conditions to proceed.",actions:[{label:"OK",variant:"primary",onClick:()=>l({...u,isOpen:!1})}]});return}b(!0);try{const r={email:a.email,fullName:a.fullName,phoneNumber:a.phone.startsWith("+91")?a.phone:`+91${a.phone.replace(/^\+?91?/,"")}`,gender:a.gender,tourDate:a.tourDate,tourTime:a.tourTime,educationalBackground:a.educationalBackground,currentOccupation:a.currentOccupation,jobTitle:a.jobTitle,examPreparation:a.examPreparation,examinationDate:a.examinationDate,howDidYouKnow:a.howDidYouKnow,previousStudyRoomExperience:a.previousStudyRoomExperience,studyRoomComparison:a.studyRoomComparison,startDate:a.startDate,requiresDnyanpittId:!1,submissionType:"tour_request"},o=await F.request("/tour/request",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(r)});if(!o||!o.success)throw new Error(o?.message||"Failed to submit tour request");p("/visitor-pass",{state:{tourData:o.data}})}catch(r){console.error("=== TOUR REQUEST ERROR ==="),console.error("Error object:",r),console.error("Error message:",r.message),console.error("Error stack:",r.stack),r.message.includes("already have a pending")?l({isOpen:!0,type:"warning",title:"Pending Request Exists",message:"You already have a pending tour request. Please wait for confirmation or contact us.",actions:[{label:"OK",variant:"primary",onClick:()=>l({...u,isOpen:!1})}]}):r.message.includes("already have a tour request for this date")?l({isOpen:!0,type:"warning",title:"Date Already Booked",message:"You already have a tour request for this date. Please choose a different date.",actions:[{label:"OK",variant:"primary",onClick:()=>l({...u,isOpen:!1})}]}):r.message.includes("Tour date must be at least tomorrow")?l({isOpen:!0,type:"error",title:"Invalid Date Selection",message:"Please select a tour date that is at least tomorrow. Today's date is not allowed.",actions:[{label:"OK",variant:"primary",onClick:()=>l({...u,isOpen:!1})}]}):l({isOpen:!0,type:"error",title:"Request Failed",message:`Failed to submit tour request: ${r.message}. Please try again or contact support.`,actions:[{label:"Retry",variant:"primary",onClick:()=>{l({...u,isOpen:!1}),P(e)}},{label:"Cancel",variant:"secondary",onClick:()=>l({...u,isOpen:!1})}]})}finally{b(!1),y(!1)}},E=()=>{p("/")};return t.jsxs("div",{className:"main-container tour-request-container",children:[t.jsx("button",{onClick:E,className:"back-button",disabled:i,children:t.jsx("svg",{width:"24",height:"24",viewBox:"0 0 24 24",fill:"none",xmlns:"http://www.w3.org/2000/svg",children:t.jsx("path",{d:"M19 12H5M12 19L5 12L12 5",stroke:"white",strokeWidth:"2",strokeLinecap:"round",strokeLinejoin:"round"})})}),t.jsxs("div",{className:"header-section",children:[t.jsx("h1",{className:"main-title",children:"Request a Tour"}),t.jsx("p",{className:"main-subtitle",children:"Schedule your personalized facility tour"})]}),t.jsxs("form",{onSubmit:P,children:[t.jsxs("div",{className:"input-group",children:[t.jsxs("label",{className:"input-label tour-input-label",children:["What is your full name?",t.jsx("div",{className:"tour-marathi-text",children:"आपले पूर्ण नाव येथे टाका"})]}),t.jsx("input",{type:"text",name:"fullName",value:a.fullName,onChange:d,className:`form-input ${s.fullName?"input-error":""}`,placeholder:"Enter your full name",disabled:i}),s.fullName&&t.jsx("div",{className:"error-message",children:s.fullName})]}),t.jsxs("div",{className:"input-group",children:[t.jsxs("label",{className:"input-label tour-input-label",children:["Enter your email address",t.jsx("div",{className:"tour-marathi-text",children:"आपला ईमेल पत्ता येथे टाका"})]}),t.jsx("input",{type:"email",name:"email",value:a.email,onChange:d,className:`form-input ${s.email?"input-error":""}`,placeholder:"Enter your email address",disabled:i}),s.email&&t.jsx("div",{className:"error-message",children:s.email})]}),t.jsxs("div",{className:"input-group",children:[t.jsxs("label",{className:"input-label tour-input-label",children:["Enter your Phone Number",t.jsx("div",{className:"tour-marathi-text",children:"आपला फोन नंबर टाका"})]}),t.jsx("input",{type:"tel",name:"phone",value:a.phone,onChange:d,className:`form-input ${s.phone?"input-error":""}`,placeholder:"Enter your phone number",disabled:i}),s.phone&&t.jsx("div",{className:"error-message",children:s.phone})]}),t.jsxs("div",{className:"input-group",children:[t.jsxs("label",{className:"input-label tour-input-label",children:["Please select your Gender",t.jsx("div",{className:"tour-marathi-text",children:"कृपया आपले लिंग निवडा"})]}),t.jsx(D,{name:"gender",value:a.gender,onChange:d,options:[{value:"male",label:"Male"},{value:"female",label:"Female"},{value:"other",label:"Other"},{value:"prefer-not-to-say",label:"Prefer not to say"}],placeholder:"Select your gender",className:"form-input",error:s.gender,disabled:i}),s.gender&&t.jsx("div",{className:"error-message",children:s.gender})]}),t.jsxs("div",{className:"input-group",children:[t.jsxs("label",{className:"input-label tour-input-label",children:["Preferred Tour Date",t.jsx("div",{className:"tour-marathi-text",children:"टूरची प्राधान्य तारीख"})]}),t.jsx(A,{name:"tourDate",value:a.tourDate,onChange:d,className:s.tourDate?"input-error":"",error:!!s.tourDate,min:new Date(Date.now()+1440*60*1e3).toISOString().split("T")[0],max:new Date(Date.now()+720*60*60*1e3).toISOString().split("T")[0],placeholder:"e.g., January 15, 2025"}),s.tourDate&&t.jsx("div",{className:"error-message",children:s.tourDate})]}),t.jsx(G,{value:a.tourTime,onChange:O,label:"Preferred Tour Time",labelHindi:"टूरची प्राधान्य वेळ",placeholder:"Select your preferred time slot",error:s.tourTime}),t.jsxs("div",{className:"input-group",children:[t.jsxs("label",{className:"input-label tour-input-label",children:["What is your educational background?",t.jsx("div",{className:"tour-marathi-text",children:"तुमची शैक्षणिक पात्रता निवडा"})]}),t.jsx(D,{name:"educationalBackground",value:a.educationalBackground,onChange:d,options:[{value:"High School",label:"High School"},{value:"Graduation",label:"Graduation"},{value:"Post Graduation",label:"Post Graduation"},{value:"Doctorate Degree",label:"Doctorate Degree"},{value:"Technical or Vocational School",label:"Technical or Vocational School"},{value:"Other",label:"Other"}],placeholder:"Select your educational background",className:"form-input",error:s.educationalBackground,disabled:i}),s.educationalBackground&&t.jsx("div",{className:"error-message",children:s.educationalBackground})]}),t.jsxs("div",{className:"input-group",children:[t.jsxs("label",{className:"input-label tour-input-label",children:["What is your current occupation?",t.jsx("div",{className:"tour-marathi-text",children:"तुमचा सध्याचा व्यवसाय निवडा"})]}),t.jsx(D,{name:"currentOccupation",value:a.currentOccupation,onChange:d,options:[{value:"Student",label:"Student"},{value:"Employed",label:"Employed"},{value:"Self-employed",label:"Self-employed"},{value:"Unemployed",label:"Unemployed"},{value:"Retired",label:"Retired"},{value:"Other",label:"Other"}],placeholder:"Select your current occupation",className:"form-input",error:s.currentOccupation,disabled:i}),s.currentOccupation&&t.jsx("div",{className:"error-message",children:s.currentOccupation})]}),t.jsxs("div",{className:"input-group",children:[t.jsxs("label",{className:"input-label tour-input-label",children:["What is your job title?",(a.currentOccupation==="Unemployed"||a.currentOccupation==="Student")&&t.jsx("span",{className:"optional-text",children:" (Not applicable)"}),t.jsx("div",{className:"tour-marathi-text",children:"तुमचा हुद्दा येथे लिहा"})]}),t.jsx("input",{type:"text",name:"jobTitle",placeholder:a.currentOccupation==="Unemployed"||a.currentOccupation==="Student"?"Not applicable for your occupation":"Enter your job title",value:a.jobTitle,onChange:d,disabled:a.currentOccupation==="Unemployed"||a.currentOccupation==="Student"||i,className:`form-input ${s.jobTitle?"input-error":""} ${a.currentOccupation==="Unemployed"||a.currentOccupation==="Student"?"disabled":""}`}),s.jobTitle&&t.jsx("div",{className:"error-message",children:s.jobTitle})]}),t.jsxs("div",{className:"input-group",children:[t.jsxs("label",{className:"input-label tour-input-label",children:["What specific exam are you preparing for by using the study room facilities?",t.jsx("div",{className:"tour-marathi-text",children:"कोणत्या परीक्षेच्या तयारीसाठी अभ्यासिकेचा वापर करणार आहात?"})]}),t.jsx(D,{name:"examPreparation",value:a.examPreparation,onChange:d,options:[{value:"MPSC",label:"MPSC"},{value:"UPSC",label:"UPSC"},{value:"Saral Seva",label:"Saral Seva"},{value:"Railway",label:"Railway"},{value:"Staff Selection Commission",label:"Staff Selection Commission"},{value:"NOR-CET",label:"NOR-CET"},{value:"Police Bharti",label:"Police Bharti"},{value:"SRPF",label:"SRPF"},{value:"CRPF",label:"CRPF"},{value:"Army-GD",label:"Army-GD"},{value:"Army-NA",label:"Army-NA"},{value:"SSC (10th)",label:"SSC (10th)"},{value:"HSC (12th)",label:"HSC (12th)"},{value:"JEE",label:"JEE"},{value:"NEET",label:"NEET"},{value:"MHT-CET",label:"MHT-CET"},{value:"UG",label:"UG"},{value:"PG",label:"PG"},{value:"PHD",label:"PHD"},{value:"MCR",label:"MCR"},{value:"CDS",label:"CDS"},{value:"DMER",label:"DMER"},{value:"Banking",label:"Banking"},{value:"Any Other",label:"Any Other"}],placeholder:"Choose an option",className:"form-input",error:s.examPreparation,disabled:i}),s.examPreparation&&t.jsx("div",{className:"error-message",children:s.examPreparation})]}),t.jsxs("div",{className:"input-group",children:[t.jsxs("label",{className:"input-label tour-input-label",children:["What is the tentative date of your examination?",t.jsx("div",{className:"tour-marathi-text",children:"तुमच्या परीक्षेची अंदाजे तारीख येथे लिहा"})]}),t.jsx(A,{name:"examinationDate",value:a.examinationDate,onChange:d,className:s.examinationDate?"input-error":"",error:!!s.examinationDate,min:new Date(Date.now()+1440*60*1e3).toISOString().split("T")[0],placeholder:"e.g., August 15, 2024"}),s.examinationDate&&t.jsx("div",{className:"error-message",children:s.examinationDate})]}),t.jsxs("div",{className:"input-group",children:[t.jsxs("label",{className:"input-label tour-input-label",children:["How did you come to know about Dnyanpeeth Abhyasika? *",t.jsx("div",{className:"tour-marathi-text",children:"ज्ञानपीठ अभ्यासिकेबाबत आपणास माहिती कशी मिळाली?"})]}),t.jsx(D,{name:"howDidYouKnow",value:a.howDidYouKnow,onChange:d,options:[{value:"Friends",label:"Friends"},{value:"Google",label:"Google"},{value:"Facebook",label:"Facebook"},{value:"Instagram",label:"Instagram"},{value:"Vivek Sindhu",label:"Vivek Sindhu"},{value:"WhatsApp",label:"WhatsApp"},{value:"SMS",label:"SMS"},{value:"Pamphlet",label:"Pamphlet"},{value:"Banner / Hoarding",label:"Banner / Hoarding"}],placeholder:"Select from options",className:"form-input",error:s.howDidYouKnow,disabled:i}),s.howDidYouKnow&&t.jsx("div",{className:"error-message",children:s.howDidYouKnow})]}),t.jsxs("div",{className:"input-group",children:[t.jsxs("label",{className:"input-label tour-input-label",children:["Have you ever studied at a study room before? If yes, please mention the name and location of the study room.",t.jsx("div",{className:"tour-marathi-text",children:"तुम्ही यापूर्वी कधी स्टडी रूममध्येे अभ्यास केला आहे का? जर होय, तर कृपया स्टडी रूमचे नाव आणि ठिकाण नमूद करा."})]}),t.jsx("input",{type:"text",name:"previousStudyRoomExperience",placeholder:"Enter study room name and location",value:a.previousStudyRoomExperience,onChange:d,className:`form-input ${s.previousStudyRoomExperience?"input-error":""}`,disabled:i}),s.previousStudyRoomExperience&&t.jsx("div",{className:"error-message",children:s.previousStudyRoomExperience})]}),t.jsxs("div",{className:"input-group",children:[t.jsxs("label",{className:"input-label tour-input-label",children:["Did you compare study room options before choosing this one? If yes, what were the deciding factors?",t.jsx("div",{className:"tour-marathi-text",children:"ज्ञानपीठ अभ्यासिका निवडण्यापूर्वी इतर स्टडी रूम सोबत तुलना केली आहे का? होय असल्यास, ज्ञानपीठ अभ्यासिका निवडण्याचे मुख्य कारण काय आहे?"})]}),t.jsx("input",{type:"text",name:"studyRoomComparison",placeholder:"Enter your comparison details and deciding factors (or write 'No' if you didn't compare)",value:a.studyRoomComparison,onChange:d,className:`form-input ${s.studyRoomComparison?"input-error":""}`,disabled:i}),s.studyRoomComparison&&t.jsx("div",{className:"error-message",children:s.studyRoomComparison})]}),t.jsxs("div",{className:"input-group",children:[t.jsxs("label",{className:"input-label tour-input-label",children:["When do you plan to start using the study room facilities?",t.jsx("div",{className:"tour-marathi-text",children:"किती तारखेपासून अभ्यासिकेला यायचे आहे?"})]}),t.jsx(A,{name:"startDate",value:a.startDate,onChange:d,className:s.startDate?"input-error":"",error:!!s.startDate,min:new Date().toISOString().split("T")[0],placeholder:"e.g., February 1, 2025"}),s.startDate&&t.jsx("div",{className:"error-message",children:s.startDate})]}),t.jsx("button",{type:"submit",className:"login-button tour-request-submit-button",disabled:i,children:i?"Submitting Request...":"Submit Tour Request"})]}),h&&t.jsx("div",{className:"modal-overlay tour-request-modal-overlay",onClick:()=>y(!1),children:t.jsxs("div",{className:"modal-content tour-request-modal-content",onClick:r=>r.stopPropagation(),children:[t.jsxs("div",{className:"modal-header tour-request-modal-header",children:[t.jsx("h2",{className:"tour-request-modal-title",children:"Self-Declaration"}),t.jsx("button",{className:"back-button tour-request-modal-close",onClick:()=>y(!1),style:{position:"relative",top:"auto",left:"auto"},children:t.jsx("svg",{width:"20",height:"20",viewBox:"0 0 24 24",fill:"none",xmlns:"http://www.w3.org/2000/svg",children:t.jsx("path",{d:"M18 6L6 18M6 6L18 18",stroke:"#ffffff",strokeWidth:"2",strokeLinecap:"round",strokeLinejoin:"round"})})})]}),t.jsx("div",{className:"modal-body tour-request-modal-body",children:t.jsxs("div",{className:"declaration-content",children:[t.jsx("div",{className:"declaration-points",children:t.jsxs("ul",{className:"tour-request-declaration-points",children:[t.jsx("li",{className:"tour-request-declaration-point",children:"I declare that all information provided in this form is true and correct to the best of my knowledge. Any false or misleading information provided may result in the rejection of my application."}),t.jsx("li",{className:"tour-request-declaration-point",children:"I am committed to maintaining a peaceful environment and will adhere to all the rules and regulations set forth by Dnyanpeeth Abhyasika. I will respect the rights of my fellow students and ensure that my behavior and conduct do not disrupt the learning process."}),t.jsx("li",{className:"tour-request-declaration-point",children:"I will use facilities responsibly and comply with Dnyanpeeth Abhyasika's regulations, avoiding disruptive or illegal activities."}),t.jsx("li",{className:"tour-request-declaration-point",children:"I declare that I won't consume tobacco or gutkha in Dnyanpeeth Abhyasika campus. Spitting after consuming such substances is prohibited, and I will maintain a clean and healthy environment for all."}),t.jsx("li",{className:"tour-request-declaration-point",children:"I will take full responsibility for the personal belongings that I bring into Dnyanpeeth Abhyasika and will not hold Dnyanpeeth Abhyasika responsible for any loss or damage to my property."}),t.jsx("li",{className:"tour-request-declaration-point",children:"I agree to pay the necessary fees for membership at Dnyanpeeth Abhyasika, including the Non-Refundable Deposit of Rs. 699/-, which will be valid for one year from the date of my membership."}),t.jsx("li",{className:"tour-request-declaration-point",children:"By submitting this form, I acknowledge that I have read, understood, and agreed to the terms and conditions set by the Dnyanpeeth Abhyasika."})]})}),t.jsx("div",{className:"agreement-section tour-request-agreement-section",children:t.jsxs("label",{className:"checkbox-container tour-request-checkbox-container",children:[t.jsx("input",{type:"checkbox",checked:N,onChange:r=>T(r.target.checked)}),t.jsx("span",{className:"checkbox-text tour-request-checkbox-text",children:"I Agree"})]})})]})}),t.jsx("div",{className:"modal-footer tour-request-modal-footer",children:t.jsx("button",{className:"login-button tour-request-modal-submit-button",onClick:q,disabled:!N||i,children:i?t.jsxs(t.Fragment,{children:[t.jsx("div",{className:"spinner"}),"Submitting..."]}):"Submit"})})]})}),t.jsx(W,{isOpen:u.isOpen,onClose:()=>l({...u,isOpen:!1}),type:u.type,title:u.title,message:u.message,actions:u.actions}),t.jsx(K,{isVisible:f==="saving"||f==="saved",status:f,showRestoreOption:v,onRestore:()=>{const r=B("tour-request-form").loadSavedData();r&&x(c=>({...c,...r})),g(!1)}})]})}export{Q as default};
