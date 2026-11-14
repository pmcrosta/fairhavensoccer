(function() {
    "use strict";

    const data = window.FHRS_SPORTS_DATA;
    if (!data) return;

    const state = {
        view: "directory",
        q: "",
        grade: "all",
        season: "all",
        gender: "all",
        pathway: "all",
        regional: false,
        gated: false,
        sport: "",
        expandedSports: new Set()
    };

    const $ = (id) => document.getElementById(id);
    const el = {
        tabs: Array.from(document.querySelectorAll(".guide-tab")),
        panels: { directory: $("panel-directory"), calendar: $("panel-calendar") },
        search: $("filter-search"),
        grade: $("filter-grade"),
        season: $("filter-season"),
        gender: $("filter-gender"),
        pathway: $("filter-pathway"),
        regional: $("toggle-regional"),
        gated: $("toggle-gated"),
        count: $("results-count"),
        reset: $("reset-filters"),
        jump: $("sport-jump"),
        sports: $("sports-container"),
        traps: $("calendar-traps"),
        calendar: $("calendar-container")
    };

    const esc = (v) => String(v == null ? "" : v)
        .replace(/&/g, "&amp;").replace(/</g, "&lt;")
        .replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");

    const pill = (label, cls) => '<span class="pill' + (cls ? " " + cls : "") + '">' + esc(label) + "</span>";
    const extLink = (url, label, cls) =>
        '<a' + (cls ? ' class="' + cls + '"' : "") + ' href="' + esc(url) +
        '" target="_blank" rel="noopener noreferrer">' + esc(label) + "</a>";

    function readUrlState() {
        const p = new URLSearchParams(window.location.search);
        const view = p.get("view");
        if (view && el.panels[view]) state.view = view;
        state.q = p.get("q") || "";
        state.grade = p.get("grade") || "all";
        state.season = p.get("season") || "all";
        state.gender = p.get("gender") || "all";
        state.pathway = p.get("pathway") || "all";
        state.regional = p.get("regional") === "1";
        state.gated = p.get("gated") === "1";
        state.sport = p.get("sport") || "";
    }

    function syncControlsToState() {
        el.search.value = state.q;
        el.grade.value = state.grade;
        el.season.value = state.season;
        el.gender.value = state.gender;
        el.pathway.value = state.pathway;
        el.regional.checked = state.regional;
        el.gated.checked = state.gated;
    }

    function syncUrl() {
        const p = new URLSearchParams();
        if (state.view !== "directory") p.set("view", state.view);
        if (state.q.trim()) p.set("q", state.q.trim());
        ["grade", "season", "gender", "pathway"].forEach((k) => { if (state[k] !== "all") p.set(k, state[k]); });
        if (state.regional) p.set("regional", "1");
        if (state.gated) p.set("gated", "1");
        if (state.sport) p.set("sport", state.sport);
        const qs = p.toString();
        try {
            window.history.replaceState(null, "", window.location.pathname + (qs ? "?" + qs : ""));
        } catch (err) {
            /* Ignore restricted origin history errors */
        }
    }

    function matchesCoreFilters(prog, sport) {
        if (state.grade !== "all" && !prog.grades.includes(state.grade)) return false;
        if (state.season !== "all" && !prog.seasons.includes(state.season) && !prog.seasons.includes("Year-round")) return false;
        if (state.gender !== "all") {
            const wantCoed = state.gender === "Co-ed";
            if (wantCoed ? !prog.gender.includes("Co-ed") : (!prog.gender.includes(state.gender) && !prog.gender.includes("Co-ed"))) {
                return false;
            }
        }
        if (state.pathway !== "all" && prog.pathway !== state.pathway) return false;
        const q = state.q.trim().toLowerCase();
        if (!q) return true;
        const hay = [sport.name, prog.name, prog.subGroup, prog.gradeNote, prog.registration, prog.commitment, prog.location, prog.accessLabel, prog.note]
            .filter(Boolean).join(" ").toLowerCase();
        return hay.includes(q);
    }

    function partitionSport(sport) {
        const visible = [];
        const hiddenByToggle = [];
        sport.programs.filter((prog) => matchesCoreFilters(prog, sport)).forEach((prog) => {
            if ((prog.isRegional && !state.regional) || (prog.isGated && !state.gated)) {
                hiddenByToggle.push(prog);
            } else {
                visible.push(prog);
            }
        });
        return { visible, hiddenByToggle };
    }

    const hasActiveFilters = () => Boolean(
        state.q.trim() || state.grade !== "all" || state.season !== "all" || state.gender !== "all" ||
        state.pathway !== "all" || state.regional || state.gated || state.expandedSports.size > 0
    );

    function buildHiddenToggleLabel(hiddenPrograms, isExpanded) {
        const n = hiddenPrograms.length;
        if (isExpanded) return "Hide " + n + (n === 1 ? " extra option" : " extra options");
        const hasReg = hiddenPrograms.some((p) => p.isRegional);
        const hasGated = hiddenPrograms.some((p) => p.isGated);
        const kind = (hasReg && !hasGated) ? "regional" : (!hasReg && hasGated ? "member" : "extra");
        return "+" + n + " hidden " + kind + (n === 1 ? " option" : " options");
    }

    function renderProgramRow(prog) {
        const cls = ["program-row", prog.isRegional ? "is-regional" : "", prog.isGated ? "is-gated" : ""].filter(Boolean).join(" ");
        const grades = prog.gradeNote || prog.grades.join(", ");
        const badges = [
            prog.subGroup ? pill(prog.subGroup, "pill-muted") : "",
            pill(prog.accessLabel),
            pill(prog.cost, "pill-muted"),
            prog.isRegional ? pill("Regional option", "pill-warn") : "",
            prog.isGated ? pill("Member or parish", "pill-warn") : ""
        ].join("");

        return (
            '<article class="' + cls + '">' +
                "<div>" +
                    '<div class="program-title">' + esc(prog.name) + "</div>" +
                    '<div class="program-badges">' + badges + "</div>" +
                    '<div class="program-meta">' + esc(grades) + " &bull; " + esc(prog.gender.join(", ")) + " &bull; " + esc(prog.seasons.join(", ")) + "</div>" +
                "</div>" +
                '<div class="program-meta">' +
                    "<strong>Registration</strong>" + esc(prog.registration) +
                    '<strong style="margin-top:6px;">Commitment</strong>' + esc(prog.commitment) +
                "</div>" +
                '<div class="program-meta"><strong>Practice location</strong>' + esc(prog.location) + "</div>" +
                '<div class="program-links">' +
                    extLink(prog.url, "Visit website", "program-visit") +
                    (prog.secondaryUrl ? extLink(prog.secondaryUrl.url, prog.secondaryUrl.label, "program-secondary-link") : "") +
                "</div>" +
                (prog.note ? '<div class="program-note">' + esc(prog.note) + "</div>" : "") +
            "</article>"
        );
    }

    function renderComparison(sport) {
        if (!sport.comparisons || !sport.comparisons.length) return "";
        const items = sport.comparisons.map((c) => "<li><strong>" + esc(c.title) + ":</strong> " + esc(c.text) + "</li>").join("");
        return '<details class="comparison-drawer"><summary>Compare ' + esc(sport.name.toLowerCase()) +
            ' pathways</summary><div class="comparison-body"><ul class="comparison-list">' + items + "</ul></div></details>";
    }

    function renderDirectory() {
        let total = 0;
        const chips = [];
        const sections = [];

        data.sports.forEach((sport) => {
            const { visible, hiddenByToggle } = partitionSport(sport);
            const expanded = state.expandedSports.has(sport.id);
            const displayed = expanded ? visible.concat(hiddenByToggle) : visible;
            if (!displayed.length && !hiddenByToggle.length) return;

            total += displayed.length;
            chips.push('<button type="button" class="jump-chip" data-jump="' + esc(sport.id) + '">' +
                esc(sport.name) + ' <span class="jump-chip-count">' + displayed.length + "</span></button>");

            const toggleHtml = hiddenByToggle.length
                ? '<div class="hidden-options-wrap"><button type="button" class="hidden-options-btn" data-expand-sport="' +
                  esc(sport.id) + '">' + esc(buildHiddenToggleLabel(hiddenByToggle, expanded)) + "</button></div>"
                : "";

            sections.push(
                '<section class="sport-section" id="sport-' + esc(sport.id) + '">' +
                    '<div class="sport-header"><h3>' + esc(sport.name) + '</h3><span class="sport-count-badge">' +
                    displayed.length + " shown</span></div>" +
                    '<p class="sport-summary">' + esc(sport.summary) + "</p>" +
                    renderComparison(sport) +
                    '<div class="program-list">' + displayed.map(renderProgramRow).join("") + "</div>" +
                    toggleHtml +
                "</section>"
            );
        });

        el.count.textContent = total + (total === 1 ? " program shown" : " programs shown");
        el.reset.hidden = !hasActiveFilters();
        el.jump.innerHTML = chips.join("");

        if (!sections.length) {
            el.sports.innerHTML = '<div class="empty-state"><h3>No matching programs</h3>' +
                "<p>Try clearing one or more filters, or enable regional or member options.</p>" +
                '<button type="button" class="btn" id="empty-reset-btn">Reset filters</button></div>';
            const emptyBtn = $("empty-reset-btn");
            if (emptyBtn) emptyBtn.addEventListener("click", resetFilters);
        } else {
            el.sports.innerHTML = sections.join("");
        }
    }

    function renderCalendar() {
        const currentMonth = new Date().getMonth();
        el.traps.innerHTML = data.calendarTraps.map((t) =>
            '<article class="trap-card"><h3>' + esc(t.title) + "</h3><p>" + esc(t.text) + "</p></article>"
        ).join("");

        el.calendar.innerHTML = '<div class="calendar-grid">' + data.calendar.map((m) => {
            const cur = m.monthIndex === currentMonth;
            return '<article class="month-card' + (cur ? " is-current-month" : "") + '">' +
                '<div class="month-head"><h3>' + esc(m.month) + "</h3>" + (cur ? pill("Current month") : "") + "</div>" +
                "<ul>" + m.deadlines.map((d) => "<li>" + esc(d) + "</li>").join("") + "</ul>" +
                '<p class="month-active"><strong>Active seasons:</strong> ' + esc(m.active) + "</p></article>";
        }).join("") + "</div>";
    }

    function switchView(nextView, focusTab) {
        if (!el.panels[nextView]) nextView = "directory";
        state.view = nextView;
        el.tabs.forEach((tab) => {
            const active = tab.dataset.view === nextView;
            tab.classList.toggle("is-active", active);
            tab.setAttribute("aria-selected", active ? "true" : "false");
            tab.setAttribute("tabindex", active ? "0" : "-1");
            if (active && focusTab) tab.focus();
        });
        Object.keys(el.panels).forEach((k) => { el.panels[k].hidden = k !== nextView; });
        syncUrl();
    }

    function resetFilters() {
        state.q = "";
        state.grade = state.season = state.gender = state.pathway = "all";
        state.regional = state.gated = false;
        state.sport = "";
        state.expandedSports.clear();
        syncControlsToState();
        renderDirectory();
        syncUrl();
    }

    function scrollToSport(sportId) {
        const target = $("sport-" + sportId);
        if (!target) return;
        state.sport = sportId;
        syncUrl();
        target.scrollIntoView({ behavior: "smooth", block: "start" });
    }

    function bindEvents() {
        el.tabs.forEach((tab, idx) => {
            tab.addEventListener("click", () => switchView(tab.dataset.view, false));
            tab.addEventListener("keydown", (e) => {
                const map = { ArrowRight: (idx + 1) % el.tabs.length, ArrowLeft: (idx - 1 + el.tabs.length) % el.tabs.length, Home: 0, End: el.tabs.length - 1 };
                if (e.key in map) { e.preventDefault(); switchView(el.tabs[map[e.key]].dataset.view, true); }
            });
        });

        const update = () => {
            state.q = el.search.value;
            state.grade = el.grade.value;
            state.season = el.season.value;
            state.gender = el.gender.value;
            state.pathway = el.pathway.value;
            state.regional = el.regional.checked;
            state.gated = el.gated.checked;
            renderDirectory();
            syncUrl();
        };

        el.search.addEventListener("input", update);
        [el.grade, el.season, el.gender, el.pathway, el.regional, el.gated].forEach((input) => input.addEventListener("change", update));
        el.reset.addEventListener("click", resetFilters);
        el.jump.addEventListener("click", (e) => {
            const btn = e.target.closest("[data-jump]");
            if (btn) scrollToSport(btn.dataset.jump);
        });
        el.sports.addEventListener("click", (e) => {
            const btn = e.target.closest("[data-expand-sport]");
            if (!btn) return;
            const id = btn.dataset.expandSport;
            state.expandedSports.has(id) ? state.expandedSports.delete(id) : state.expandedSports.add(id);
            renderDirectory();
        });
    }

    readUrlState();
    syncControlsToState();
    renderCalendar();
    renderDirectory();
    switchView(state.view, false);
    bindEvents();
    if (state.sport && state.view === "directory") scrollToSport(state.sport);
})();
