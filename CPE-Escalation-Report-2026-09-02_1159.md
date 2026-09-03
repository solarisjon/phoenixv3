# CPE Sustaining Engineering Escalation Report

**Generated:** September 02, 2026 11:59 MDT
**Scope:** All open (non-Done) Jira issues in the CPE project (Continuous Product Engineering / Sustaining Engineering Escalation)
**Team:** Mike Martinez (mmichae2), Joe Bloom (jb79491), Peter Ninnemann (pninnema), Chris Cochran (cochranc)

## Summary

| Team Member | Open Cases | P1 | P2 | P3 |
|---|---|---|---|---|
| Joe Bloom | 6 | 3 | 3 | 0 |
| Chris Cochran | 8 | 2 | 5 | 1 |
| Mike Martinez | 9 | 3 | 5 | 1 |
| Peter Ninnemann | 1 | 0 | 0 | 1 |
| **Total** | **24** | **8** | **13** | **3** |

**Notes for manager attention:**
- **CPE-12780** (Martinez, Intel-Folsum, P3) — Next Steps date was Aug 28; appears past due, needs status refresh.
- **CPE-10979** (Martinez, Renaissance, P2) — Next Steps date was Aug 12; appears past due, HW RCA targeted end of Q1 2027 (long-running).
- **CPE-12658** (Martinez, Total France SA, P2) — Next Steps date was Aug 27; appears past due, needs status refresh.
- **CPE-13256** (Martinez, Thüringer Energie AG, P1) — Marked "Ready to close"; pending customer/support confirmation to archive.

---

## Joe Bloom (jb79491)

| CPE Case Number | Priority | Customer Name | Description | State (Escalation Status) |
|---|---|---|---|---|
| [CPE-13459](https://jira.ngage.netapp.com/browse/CPE-13459) | P1 | Synopsys Inc | iSCSI LIFs show admin "up" but operational status "down," blocking ONTAP upgrade | **Wait Info.** Remediation activity scheduled Sept 3, 11:00 AM IST to execute Engineering-approved plan (per-node DB cleanup, controlled HA takeover/giveback, reboots). Next update: Sep 3. |
| [CPE-13524](https://jira.ngage.netapp.com/browse/CPE-13524) | P1 | Bayerisches Landesamt für Steuern | After ONTAP upgrade, FCP ESXi servers crash due to VMFS datastore corruption | **Active.** Dev traces show no target defect; awaiting VMware host core data and Brocade fabric event data around fault windows. Next update: Sep 2. |
| [CPE-13554](https://jira.ngage.netapp.com/browse/CPE-13554) | P1 | Catholic Health Services of Long Island | [US SECURE] Latency after migrating to A1k; NRZ vs PAM4 link-speed differences | **Active.** Confirmed NRZ/PAM4 is link-speed related, not adapter model. Waiting on logs/traces for analysis. Next update: Sep 2. |
| [CPE-12376](https://jira.ngage.netapp.com/browse/CPE-12376) | P2 | Kanematsu Electronics Ltd. | NTFS filesystem corruption on multiple GuestOS with NetApp Storage | **Wait Info.** Customer/partner testing latest firmware + VMID disable; testing expected complete end of August, ONTAP upgrade planned September. |
| [CPE-11935](https://jira.ngage.netapp.com/browse/CPE-11935) | P2 | Vision Service Plan | AIX/MPIO path status updated incorrectly | **Active.** Live reproduction attempts with customer ongoing (zoning/mapping config changes). Next call: Tue Sep 8, 11:00 AM MST. |
| [CPE-12826](https://jira.ngage.netapp.com/browse/CPE-12826) | P2 | Sofidel SpA | FC link issues | **Active.** Determining recommended Cisco NX-OS firmware version (stay 9.4(4), downgrade to 9.4(3), or upgrade to 9.4(5)). Next update: Sep 2. |

## Chris Cochran (cochranc)

| CPE Case Number | Priority | Customer Name | Description | State (Escalation Status) |
|---|---|---|---|---|
| [CPE-13137](https://jira.ngage.netapp.com/browse/CPE-13137) | P1 | HPE G (Google) | Trident times out when provisioning ONTAP SAN volume | **Wait Info.** TRID-20249 accepted; TRID-20250 nearly merged, backported patch expected in 26.10. Monitoring Trident bugs. Next update: Sep 2. |
| [CPE-13423](https://jira.ngage.netapp.com/browse/CPE-13423) | P1 | Bank Julius | CLI unresponsive and slow | **Active.** New findings on userspace maxing out; two lost core files recovered, MGWD core under manual SME review. Next update: Sep 2. |
| [CPE-13182](https://jira.ngage.netapp.com/browse/CPE-13182) | P2 | Ticketmaster | NTP clock skew on newly added nodes to cluster | **Wait Info.** Workaround (from related DZ Bank NTP drift ticket) validated; DOA cancelled. Waiting on customer to accept/schedule workaround. Next update: Sep 2. |
| [CPE-12941](https://jira.ngage.netapp.com/browse/CPE-12941) | P2 | Universitätsklinikum Münster | MGWD panics/offline; Dev requested CPE engagement | **Wait Info.** Fix version now 9.16.1P16; CAP formally closed; SmartSolve status "solution proposed." Monitoring for release. Next update: Sep 2. |
| [CPE-13490](https://jira.ngage.netapp.com/browse/CPE-13490) | P2 | Nvidia | Thousands of delete operations took too long | **Active.** Root cause confirmed as same defect as TRID-19985 (global lock); linked rather than duplicated. Assessing concurrency-flag impact / possible RFE. Next update: Sep 3. |
| [CPE-13119](https://jira.ngage.netapp.com/browse/CPE-13119) | P2 | Atos | SCC pre-script reports wrong exit code on AIX | **Wait Info.** D-Patch install issue resolved; customer now testing the fix. Awaiting results. Next update: Sep 2. |
| [CPE-13519](https://jira.ngage.netapp.com/browse/CPE-13519) | P2 | Nvidia | Failed cluster join | **Wait Info.** New mroot bundle reviewed; no single bad node identified. Working theory: moving master role issue. Additional data requested. Next update: Sep 3. |
| [CPE-13463](https://jira.ngage.netapp.com/browse/CPE-13463) | P3 | NTS Deutschland GmbH | QLogic 2800 FC adapter hang (scsitarget.fct.fntimeout) | **Active.** Investigating cmdblk saturation root cause via ONTAP code review; several open questions, will pull in SME before next update. Next update: on/before Sep 2. |

## Mike Martinez (mmichae2)

| CPE Case Number | Priority | Customer Name | Description | State (Escalation Status) |
|---|---|---|---|---|
| [CPE-13410](https://jira.ngage.netapp.com/browse/CPE-13410) | P1 | General Dynamics | VMs on GDD Advanced FlexGroup do not power on; AIR Certification Cancelled | **Wait Info.** RCA active under CONTAP-771199. Customer fully recovered (FlexGroups deleted, VMs migrated Aug 16). Blocked on secure core dump upload and fg_rebalance.log data. Next update: Sep 9. |
| [CPE-13211](https://jira.ngage.netapp.com/browse/CPE-13211) | P1 | Lattice Semiconductor Corp. | AFF C800 HA pair panics, production outage, WAFL extent leak | **Wait Info.** Third panic (Aug 24) confirms CONTAP-750706 (EAUDIT_FAILED extent leak); fix in test/validation. Controlled reboot remains interim mitigation. Next update: Sep 3. |
| [CPE-13256](https://jira.ngage.netapp.com/browse/CPE-13256) | P1 | Thüringer Energie AG | Controller halt + sensor reading failures; suspected I2C bus lock/cross-contamination | **Wait Info — Ready to close.** Stable since chassis/motherboard replacement Aug 3, no recurrence. HW RCA parts not yet at RMA site (int'l shipping); results possibly not until mid-October. Awaiting customer decision to archive vs. keep open. Next update: Sep 15. |
| [CPE-12658](https://jira.ngage.netapp.com/browse/CPE-12658) | P2 | Total France SA | Huge bucket size/object count mismatch between AWS CLI and ONTAP CLI | **Wait Info.** SME-provided commands issued to support to help isolate mismatch source; discussing next steps with Dev SME. *(Next Steps date Aug 27 — past due, needs refresh.)* |
| [CPE-13251](https://jira.ngage.netapp.com/browse/CPE-13251) | P2 | Raytheon Applied Signal Technology | Quotas causing log spam with disabled user account | **Wait Info.** Fix submitted in CONTAP-757873 (dev@8244939); lab validation blocked on Windows client availability in CTL reservation. Public workaround (CONTAP-760348) online but customer can't use most options. Next update: Sep 3. |
| [CPE-11042](https://jira.ngage.netapp.com/browse/CPE-11042) | P2 | Travelport | AFF-A70 L2 WDR persists after motherboard replacements | **Wait Info.** Chamber stress testing ongoing at Intel, unable to reproduce yet. No customer recurrence since Nov 2025; kept open pending root cause delivery. Next update: Sep 21. |
| [CPE-10642](https://jira.ngage.netapp.com/browse/CPE-10642) | P2 | Socionext Inc. | Recurring DIMM CECC errors causing performance problems | **Wait Info.** Stable since Sep 25, 2025 HW replacement. HW RCA (CHW-3459) found foreign object debris on DIMM connector pins; awaiting Jabil Guadalajara failure analysis confirmation. Next update: Sep 15. |
| [CPE-10979](https://jira.ngage.netapp.com/browse/CPE-10979) | P2 | Renaissance Technologies LLC | AFF A90 failing DIMM caused hour-long outage | **Wait Info.** PCM + DIMMs en route to Jabil Guadalajara; onsite inspection planned next month. Definitive root cause targeted end of Q1 2027 (long-running HW RCA). *(Next Steps date Aug 12 — past due, needs refresh.)* |
| [CPE-12780](https://jira.ngage.netapp.com/browse/CPE-12780) | P3 | Intel-Folsum | Auto export policies not adding rules in 26.02.0 | **Wait Info.** Short-term workaround identified (disable concurrency + restart trident-controller pod); TRID-20198 linked as the fix. *(Next Steps date Aug 28 — past due, needs refresh.)* |

## Peter Ninnemann (pninnema)

| CPE Case Number | Priority | Customer Name | Description | State (Escalation Status) |
|---|---|---|---|---|
| [CPE-12232](https://jira.ngage.netapp.com/browse/CPE-12232) | P3 | Wells Fargo Bank | QOS prematurely throttling workloads | **Wait Info.** CONTAP bug assigned; Engineering determining whether this is a CTRAN infrastructure issue or client-side issue. No next-update date recorded — recommend following up for a target date. |

---

*Report generated from Jira project CPE via automated query (assignee in mmichae2, jb79491, pninnema, cochranc; statusCategory != Done). CaseID/Customer/Escalation Status pulled from custom fields (CaseID, Customer (CPE), Escalation Status).*
