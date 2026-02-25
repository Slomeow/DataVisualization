/*
Get Name from csv
Get Documents from csv
Show text for each person name
show document count in bar graph

*/

let table;
let personNames, categories, bios, documents, flights;
let documentsTopData = [];
let flightsTopData = [];
let currentMetric = 'documents';
let toggleMetricButton;
let pageFlipSound;
let scrollStartIndex = 0;
let barRevealProgress = {};
let horizontalScrollX = 0;
let isDraggingVScrollbar = false;
let vScrollbarDragOffsetY = 0;
let isDraggingHScrollbar = false;
let hScrollbarDragOffsetX = 0;
const BAR_ANIMATION_SPEED = 0.03;
const TOP_DOCS_N = 198;
const TOP_FLIGHTS_N = 96;
const ROW_HEIGHT = 50;
const SCROLLBAR_X = 8;
const SCROLLBAR_WIDTH = 12;


async function setup() {
  createCanvas(windowWidth, windowHeight);
  table = await loadTable('epstein-persons-2026-02-13_cleaned.csv', ',', 'header');
  pageFlipSound = new Audio('Sound/page-flip-01a.mp3');
  pageFlipSound.preload = 'auto';
  console.log(table);

  personNames = table.getColumn('Name');
  categories = table.getColumn('Category');
  bios = table.getColumn('Bio');
  documents = table.getColumn(6).map((value) => parseFloat(value));
  flights = table.getColumn(5).map((value) => parseFloat(value));
  let rowLimit = table.getRowCount();

  textFont('Courier New');
  textAlign(CENTER, CENTER);
  textStyle(BOLD);

  let allPeopleData = [];
  for (let i = 0; i < rowLimit; i++) {
    let docCount = documents[i];
    let flightCount = flights[i];

    if (isNaN(docCount) && isNaN(flightCount)) {
      continue;
    }

    allPeopleData.push({
      name: personNames[i],
      category: categories[i] || 'N/A',
      bio: bios[i] || 'N/A',
      documents: isNaN(docCount) ? 0 : docCount,
      flights: isNaN(flightCount) ? 0 : flightCount
    });
  }

  documentsTopData = [...allPeopleData]
    .sort((a, b) => b.documents - a.documents)
    .slice(0, TOP_DOCS_N);

  flightsTopData = [...allPeopleData]
    .sort((a, b) => b.flights - a.flights)
    .slice(0, TOP_FLIGHTS_N);

  createMetricToggleButton();
}

function getCurrentPeopleData() {
  return currentMetric === 'documents' ? documentsTopData : flightsTopData;
}

function getMetricValue(item) {
  return currentMetric === 'documents' ? item.documents : item.flights;
}

function getMetricMax() {
  let currentData = getCurrentPeopleData();
  if (currentData.length === 0) {
    return 1;
  }

  return max(currentData.map((item) => getMetricValue(item)));
}

function getMetricMin() {
  let currentData = getCurrentPeopleData();
  if (currentData.length === 0) {
    return 0;
  }

  return min(currentData.map((item) => getMetricValue(item)));
}

function getMetricLabel() {
  return currentMetric === 'documents' ? 'documents' : 'flights';
}

function getMetricScaleMax() {
  let values = getCurrentPeopleData()
    .map((item) => getMetricValue(item))
    .filter((value) => !isNaN(value))
    .sort((a, b) => a - b);

  if (values.length === 0) {
    return 1;
  }

  let percentileIndex = floor((values.length - 1) * 0.99);
  let percentileValue = values[percentileIndex];
  return max(1, percentileValue);
}

function getBarKey(item) {
  return `${currentMetric}::${item.name}`;
}

function advanceBarAnimations() {
  for (let key in barRevealProgress) {
    if (barRevealProgress[key] > 0 && barRevealProgress[key] < 1) {
      barRevealProgress[key] = min(1, barRevealProgress[key] + BAR_ANIMATION_SPEED);
    }
  }
}

function createMetricToggleButton() {
  toggleMetricButton = createButton('Switch to Flights');
  toggleMetricButton.addClass('folder-tab-button');
  toggleMetricButton.mousePressed(() => {
    if (pageFlipSound) {
      pageFlipSound.currentTime = 0;
      pageFlipSound.play().catch(() => { });
    }

    currentMetric = currentMetric === 'documents' ? 'flights' : 'documents';
    toggleMetricButton.html(currentMetric === 'documents' ? 'Switch to Flights' : 'Switch to Documents');
    scrollStartIndex = 0;
    horizontalScrollX = 0;
  });

  positionMetricToggleButton();
}

function getInfoPanelGeometry() {
  let panelWidth = min(460, width * 0.42);
  let panelHeight = min(210, height * 0.33);
  let panelX = width - panelWidth - 25;
  let panelY = height - panelHeight - 25;
  let tabWidth = min(220, panelWidth * 0.58);
  let tabHeight = 34;

  return { panelWidth, panelHeight, panelX, panelY, tabWidth, tabHeight };
}

function positionMetricToggleButton() {
  if (!toggleMetricButton) {
    return;
  }

  let { panelX, panelY } = getInfoPanelGeometry();
  let buttonHeight = toggleMetricButton.elt ? toggleMetricButton.elt.offsetHeight : 0;
  let buttonX = panelX + 2;
  let buttonY = panelY - buttonHeight + 2;
  toggleMetricButton.position(buttonX, buttonY);
}

function getHoveredIndex(topPadding, visibleRows) {
  let currentData = getCurrentPeopleData();
  if (mouseY < topPadding || mouseY > topPadding + visibleRows * ROW_HEIGHT) {
    return -1;
  }

  let hoveredIndex = floor((mouseY - topPadding) / ROW_HEIGHT) + scrollStartIndex;
  if (hoveredIndex < 0 || hoveredIndex >= currentData.length) {
    return -1;
  }

  return hoveredIndex;
}

function clampScrollIndex(totalRows, visibleRows) {
  let maxStart = max(0, totalRows - visibleRows);
  scrollStartIndex = constrain(scrollStartIndex, 0, maxStart);
}

function getViewportLayout() {
  let topPadding = 100;
  let bottomPadding = max(40, height * 0.05);
  let visibleRows = max(1, floor((height - topPadding - bottomPadding) / ROW_HEIGHT));
  return { topPadding, bottomPadding, visibleRows };
}

function getChartGeometry(currentData) {
  let { topPadding, bottomPadding, visibleRows } = getViewportLayout();
  let nameTextSize = constrain(ROW_HEIGHT * 0.5, 20, 16);
  textSize(nameTextSize);
  let maxNameWidth = 0;
  for (let item of currentData) {
    maxNameWidth = max(maxNameWidth, textWidth(item.name || ''));
  }

  let nameColumnPadding = 12;
  let barStartGap = 16;
  let nameColumnWidth = constrain(maxNameWidth + nameColumnPadding * 1, 180, width * 0.15);
  let chartLeft = min(width - 80, nameColumnWidth + barStartGap);
  let chartRight = width - 10;
  let chartWidth = max(1, chartRight - chartLeft);

  return { topPadding, bottomPadding, visibleRows, nameTextSize, chartLeft, chartRight, chartWidth };
}

function getScrollbarGeometry(totalRows, visibleRows, topPadding) {
  let trackX = SCROLLBAR_X;
  let trackY = topPadding;
  let trackWidth = SCROLLBAR_WIDTH;
  let trackHeight = visibleRows * ROW_HEIGHT;
  let maxStart = max(0, totalRows - visibleRows);

  let thumbHeight = trackHeight;
  if (totalRows > 0) {
    thumbHeight = max(24, trackHeight * min(1, visibleRows / totalRows));
  }
  thumbHeight = min(thumbHeight, trackHeight);

  let thumbY = trackY;
  if (maxStart > 0 && trackHeight > thumbHeight) {
    let ratio = scrollStartIndex / maxStart;
    thumbY = trackY + ratio * (trackHeight - thumbHeight);
  }

  return {
    trackX,
    trackY,
    trackWidth,
    trackHeight,
    thumbY,
    thumbHeight,
    maxStart
  };
}

function drawScrollBar(totalRows, visibleRows, topPadding) {
  let geom = getScrollbarGeometry(totalRows, visibleRows, topPadding);

  noStroke();
  fill(255);
  rect(geom.trackX, geom.trackY, geom.trackWidth, geom.trackHeight, 6);

  let thumbColor = isDraggingVScrollbar ? 60 : 90;
  fill(thumbColor);
  rect(geom.trackX, geom.thumbY, geom.trackWidth, geom.thumbHeight, 6);
}

function getHorizontalScrollbarGeometry(chartLeft, chartWidth, topPadding, maxHorizontalScroll) {
  let trackX = chartLeft;
  let trackY = topPadding - 18;
  let trackWidth = chartWidth;
  let trackHeight = SCROLLBAR_WIDTH;

  let thumbWidth = trackWidth;
  let contentWidth = chartWidth + maxHorizontalScroll;
  if (contentWidth > 0) {
    thumbWidth = max(24, trackWidth * min(1, chartWidth / contentWidth));
  }
  thumbWidth = min(thumbWidth, trackWidth);

  let thumbX = trackX;
  if (maxHorizontalScroll > 0 && trackWidth > thumbWidth) {
    let ratio = horizontalScrollX / maxHorizontalScroll;
    thumbX = trackX + ratio * (trackWidth - thumbWidth);
  }

  return {
    trackX,
    trackY,
    trackWidth,
    trackHeight,
    thumbX,
    thumbWidth,
    maxHorizontalScroll
  };
}

function drawTopScrollBar(chartLeft, chartWidth, topPadding, maxHorizontalScroll) {
  let geom = getHorizontalScrollbarGeometry(chartLeft, chartWidth, topPadding, maxHorizontalScroll);

  noStroke();
  fill(255);
  rect(geom.trackX, geom.trackY, geom.trackWidth, geom.trackHeight, 6);

  let thumbColor = isDraggingHScrollbar ? 60 : 90;
  fill(thumbColor);
  rect(geom.thumbX, geom.trackY, geom.thumbWidth, geom.trackHeight, 6);
}

function setScrollFromThumbY(thumbY, geom) {
  if (geom.maxStart <= 0 || geom.trackHeight <= geom.thumbHeight) {
    scrollStartIndex = 0;
    return;
  }

  let minY = geom.trackY;
  let maxY = geom.trackY + geom.trackHeight - geom.thumbHeight;
  let clampedY = constrain(thumbY, minY, maxY);
  let ratio = (clampedY - minY) / (maxY - minY);
  scrollStartIndex = round(ratio * geom.maxStart);
}

function clampHorizontalScroll(maxHorizontalScroll) {
  horizontalScrollX = constrain(horizontalScrollX, 0, maxHorizontalScroll);
}

function setHorizontalScrollFromThumbX(thumbX, geom) {
  if (geom.maxHorizontalScroll <= 0 || geom.trackWidth <= geom.thumbWidth) {
    horizontalScrollX = 0;
    return;
  }

  let minX = geom.trackX;
  let maxX = geom.trackX + geom.trackWidth - geom.thumbWidth;
  let clampedX = constrain(thumbX, minX, maxX);
  let ratio = (clampedX - minX) / (maxX - minX);
  horizontalScrollX = ratio * geom.maxHorizontalScroll;
}

function draw() {
  clear();
  noStroke();
  fill(255, 255, 255, 95);
  rect(0, 0, width, height);
  advanceBarAnimations();

  let currentData = getCurrentPeopleData();

  if (!table || currentData.length === 0) {
    return;
  }

  positionMetricToggleButton();

  let { topPadding, bottomPadding, visibleRows, nameTextSize, chartLeft, chartRight, chartWidth } = getChartGeometry(currentData);
  clampScrollIndex(currentData.length, visibleRows);
  let barHeight = max(1, ROW_HEIGHT * 0.9);
  let hoveredIndex = getHoveredIndex(topPadding, visibleRows);
  let metricMax = getMetricMax();
  let metricMin = getMetricMin();
  let metricLabel = getMetricLabel();
  let metricScaleMax = getMetricScaleMax();
  let hoveredItem = null;
  let hoveredMetricValue = 0;

  fill(20);
  textSize(35);
  textAlign(CENTER, TOP);
  text(`Viewing: ${metricLabel.charAt(0).toUpperCase() + metricLabel.slice(1)}`, width / 2, 16);

  stroke(210);
  line(chartLeft, height - bottomPadding + 10, chartRight, height - bottomPadding + 10);
  noStroke();

  fill(30);
  textSize(12);
  textAlign(LEFT, CENTER);
  text('0', chartLeft + 2, height - bottomPadding + 22);
  textAlign(RIGHT, CENTER);
  text(nf(metricScaleMax, 1, 0), chartRight - 4, height - bottomPadding + 22);

  let maxBarWidth = 0;
  for (let item of currentData) {
    let w = map(getMetricValue(item), 0, metricScaleMax, 0, chartWidth);
    maxBarWidth = max(maxBarWidth, w);
  }
  let maxHorizontalScroll = max(0, maxBarWidth - chartWidth);
  clampHorizontalScroll(maxHorizontalScroll);

  textSize(nameTextSize);
  let endIndex = min(currentData.length, scrollStartIndex + visibleRows);
  for (let i = scrollStartIndex; i < endIndex; i++) {
    let item = currentData[i];
    let metricValue = getMetricValue(item);
    let visibleRowIndex = i - scrollStartIndex;
    let rowY = topPadding + visibleRowIndex * ROW_HEIGHT;
    let y = rowY + (ROW_HEIGHT - barHeight) / 2;
    let barWidth = map(metricValue, 0, metricScaleMax, 0, chartWidth);
    let barKey = getBarKey(item);
    if (barRevealProgress[barKey] === undefined) {
      barRevealProgress[barKey] = 0;
    }

    if (i === hoveredIndex && barRevealProgress[barKey] === 0) {
      barRevealProgress[barKey] = 0.001;
    }

    let animatedBarWidth = barWidth * barRevealProgress[barKey];
   // let greenAmount = map(metricValue, metricMin, metricMax, 0, 1);

    if (i === hoveredIndex) {
      fill(255, 255, 170);
      rect(0, rowY, width, ROW_HEIGHT);
    }

    let barDrawX = chartLeft - horizontalScrollX;
    let barDrawRight = barDrawX + animatedBarWidth;
    let visibleBarLeft = max(chartLeft, barDrawX);
    let visibleBarRight = min(chartRight, barDrawRight);
    let visibleBarWidth = max(0, visibleBarRight - visibleBarLeft);

    noStroke();
    fill(0, 255 * 0, 0);
    if (visibleBarWidth > 0) {
      rect(visibleBarLeft, y, visibleBarWidth, barHeight);
    }

    if (barRevealProgress[barKey] >= 1 && barWidth > 20) {
      let valueText = `${nf(metricValue, 1, 0)}`;
      let valueX = barDrawX + barWidth - 5;
      if (valueX >= chartLeft + 6 && valueX <= chartRight - 2) {
        fill(255);
        textSize(constrain(ROW_HEIGHT * 0.45, 10, 14));
        textAlign(RIGHT, CENTER);
        text(valueText, valueX, rowY + ROW_HEIGHT / 2);
        textSize(nameTextSize);
      }
    }

    stroke(100, 100, 100);
    strokeWeight(0.5);
    fill(20);
    textAlign(RIGHT, CENTER);
    text(item.name, chartLeft - 8, rowY + ROW_HEIGHT / 2);
    noStroke();

    if (i === hoveredIndex) {
      hoveredItem = item;
      hoveredMetricValue = metricValue;
      let tooltip = `${item.name}: ${nf(metricValue, 1, 0)} ${metricLabel}`;
      let padding = 8;
      let tooltipWidth = textWidth(tooltip) + padding * 2;
      let tooltipHeight = 24;
      let tooltipX = constrain(mouseX + 12, 0, width - tooltipWidth);
      let tooltipY = constrain(mouseY - 30, 0, height - tooltipHeight);

      fill(255, 245);
      rect(tooltipX, tooltipY, tooltipWidth, tooltipHeight, 4);
      fill(20);
      textAlign(LEFT, CENTER);
      text(tooltip, tooltipX + padding, tooltipY + tooltipHeight / 2);
      textSize(nameTextSize);
    }
  }

  drawTopScrollBar(chartLeft, chartWidth, topPadding, maxHorizontalScroll);
  drawScrollBar(currentData.length, visibleRows, topPadding);
  drawHoverInfoPanel(hoveredItem, hoveredMetricValue, metricLabel);
}

function mouseWheel(event) {
  let currentData = getCurrentPeopleData();
  let { topPadding, visibleRows } = getViewportLayout();

  if (mouseY >= topPadding && mouseY <= topPadding + visibleRows * ROW_HEIGHT) {
    if (event.delta > 0) {
      scrollStartIndex += 1;
    } else if (event.delta < 0) {
      scrollStartIndex -= 1;
    }

    clampScrollIndex(currentData.length, visibleRows);
    return false;
  }
}

function mousePressed() {
  let currentData = getCurrentPeopleData();
  let { topPadding, visibleRows, chartLeft, chartWidth } = getChartGeometry(currentData);

  let metricScaleMax = getMetricScaleMax();
  let maxBarWidth = 0;
  for (let item of currentData) {
    let w = map(getMetricValue(item), 0, metricScaleMax, 0, chartWidth);
    maxBarWidth = max(maxBarWidth, w);
  }
  let maxHorizontalScroll = max(0, maxBarWidth - chartWidth);

  let hGeom = getHorizontalScrollbarGeometry(chartLeft, chartWidth, topPadding, maxHorizontalScroll);
  let overTopTrack = mouseX >= hGeom.trackX && mouseX <= hGeom.trackX + hGeom.trackWidth &&
    mouseY >= hGeom.trackY && mouseY <= hGeom.trackY + hGeom.trackHeight;

  if (overTopTrack && hGeom.maxHorizontalScroll > 0) {
    let overTopThumb = mouseX >= hGeom.thumbX && mouseX <= hGeom.thumbX + hGeom.thumbWidth;
    if (overTopThumb) {
      isDraggingHScrollbar = true;
      hScrollbarDragOffsetX = mouseX - hGeom.thumbX;
      return;
    }

    setHorizontalScrollFromThumbX(mouseX - hGeom.thumbWidth / 2, hGeom);
    isDraggingHScrollbar = true;
    hScrollbarDragOffsetX = hGeom.thumbWidth / 2;
    return;
  }

  let geom = getScrollbarGeometry(currentData.length, visibleRows, topPadding);

  let overTrack = mouseX >= geom.trackX && mouseX <= geom.trackX + geom.trackWidth &&
    mouseY >= geom.trackY && mouseY <= geom.trackY + geom.trackHeight;

  if (!overTrack || geom.maxStart <= 0) {
    return;
  }

  let overThumb = mouseY >= geom.thumbY && mouseY <= geom.thumbY + geom.thumbHeight;
  if (overThumb) {
    isDraggingVScrollbar = true;
    vScrollbarDragOffsetY = mouseY - geom.thumbY;
    return;
  }

  setScrollFromThumbY(mouseY - geom.thumbHeight / 2, geom);
  isDraggingVScrollbar = true;
  vScrollbarDragOffsetY = geom.thumbHeight / 2;
}

function mouseDragged() {
  let currentData = getCurrentPeopleData();
  let { topPadding, visibleRows, chartLeft, chartWidth } = getChartGeometry(currentData);

  if (isDraggingHScrollbar) {
    let metricScaleMax = getMetricScaleMax();
    let maxBarWidth = 0;
    for (let item of currentData) {
      let w = map(getMetricValue(item), 0, metricScaleMax, 0, chartWidth);
      maxBarWidth = max(maxBarWidth, w);
    }
    let maxHorizontalScroll = max(0, maxBarWidth - chartWidth);
    let hGeom = getHorizontalScrollbarGeometry(chartLeft, chartWidth, topPadding, maxHorizontalScroll);
    setHorizontalScrollFromThumbX(mouseX - hScrollbarDragOffsetX, hGeom);
    return;
  }

  if (isDraggingVScrollbar) {
    let geom = getScrollbarGeometry(currentData.length, visibleRows, topPadding);
    setScrollFromThumbY(mouseY - vScrollbarDragOffsetY, geom);
  }
}

function mouseReleased() {
  isDraggingVScrollbar = false;
  isDraggingHScrollbar = false;
}

function drawHoverInfoPanel(item, metricValue, metricLabel) {
  let panelPadding = 20;
  let { panelWidth, panelHeight, panelX, panelY, tabWidth, tabHeight } = getInfoPanelGeometry();

  noStroke();
  fill(247, 236, 207, 242);
  beginShape();
  vertex(panelX + 12, panelY);
  vertex(panelX + tabWidth, panelY);
  vertex(panelX + tabWidth + 20, panelY + tabHeight);
  vertex(panelX + 12, panelY + tabHeight);
  endShape(CLOSE);

  fill(247, 236, 207, 235);
  stroke(70, 58, 40, 140);
  strokeWeight(2);
  rect(panelX, panelY, panelWidth, panelHeight, 8);
  noStroke();

  fill(43, 36, 25);
  textAlign(LEFT, TOP);
  textSize(16);
  text('Personal Details', panelX + panelPadding + 4, panelY + 8);

  if (!item) {
    textSize(13);
    fill(70, 58, 40);
    text('Hover over a name to view their info.', panelX + panelPadding, panelY + tabHeight + 14);
    return;
  }

  textSize(16);
  let labelX = panelX + panelPadding;
  let labelY = panelY + tabHeight + 10;
  let chipPaddingX = 8;
  let chipHeight = 24;
  let chipGap = 8;
  let nameText = `${item.name}`;
  let metricTitle = `${metricLabel.charAt(0).toUpperCase() + metricLabel.slice(1)}`;
  let metricText = `${metricTitle}: ${nf(metricValue, 1, 0)}`;

  let nameChipWidth = textWidth(nameText) + chipPaddingX * 2;
  let metricChipWidth = textWidth(metricText) + chipPaddingX * 2;

  fill(0);
  rect(labelX, labelY - 1, nameChipWidth, chipHeight, 4);
  fill(255);
  textAlign(LEFT, TOP);
  text(nameText, labelX + chipPaddingX, labelY + 2);

  fill(0);
  rect(labelX + nameChipWidth + chipGap, labelY - 1, metricChipWidth, chipHeight, 4);
  fill(255);
  text(metricText, labelX + nameChipWidth + chipGap + chipPaddingX, labelY + 2);

  textSize(17);
  fill(30, 24, 18);
  text(`${item.category}`, panelX + panelPadding, panelY + tabHeight + 42, panelWidth - panelPadding * 2, 34);
  text(`${item.bio}`, panelX + panelPadding, panelY + tabHeight + 78, panelWidth - panelPadding * 2, panelHeight - 104);
}

function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
}