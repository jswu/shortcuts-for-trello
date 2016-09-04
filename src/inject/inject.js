/* global chrome */
chrome.extension.sendMessage({}, function() {

  // Hack ':contains' to be case-insensitive
  $.expr[':'].contains = function(a, i, m) {
      return jQuery(a).text().toUpperCase().indexOf(m[3].toUpperCase()) >= 0;
  };

  var elm, card, readyStateCheckInterval;

  readyStateCheckInterval = setInterval(function() {
    if (document.readyState === "complete") {
      clearInterval(readyStateCheckInterval);
      chrome.runtime.onMessage.addListener(routeCommand);
    }
  }, 10);

  function routeCommand(request) {
    card = $('.active-card');
    switch(request.command) {
        case 'movecard':
          moveCard(card);
        break;
        case 'copycard':
          copyCard();
        break;
        case 'yank':
          yank();
        break;
        case 'movecardup':
          moveCardUp();
        break;
        case 'notifications':
          notifications();
        break;
        case 'scrolltop':
          scrollTop();
        break;
        case 'scrollbottom':
          scrollBottom();
        break;
        case 'collapselist':
          collapseList();
        break;
        case 'newboard':
          newBoard();
        break;
        case 'movecardtodone':
          moveCardToDoneCommand();
        break;
        case 'movecardtolist':
          moveCardToListCommand();
        break;
        case 'movecardtoposition':
          moveCardToPositionCommand();
        break;
        case 'sortcardbylabel':
          // Move the card to the position above the first card with the same
          // label in the list.
          // Uses the first label of the selected card.
          sortCardByLabelCommand();
        break;
    }
  }

  function newBoard(){
    $('span.header-btn-icon.icon-lg.icon-add.light').click();

    setTimeout(function(){
      var elm = document.querySelector('a.js-new-board');
      elm.click();
    });

  }

  function moveCard() {
    if(card.length !== 1) return;

    card.find('span.list-card-operation').trigger('click');
    elm = document.querySelector('a.js-move-card');

    elm.click();
  }

  function copyCard() {
    if(card.length !== 1) return;

    card.find('span.list-card-operation').trigger('click');
    elm = document.querySelector('a.js-copy-card');

    elm.click();
  }

  function yank() {
    if(card.length !== 1) return;

    var url = $('.list-card-details > a', card)[0].href;
    url = url.substr(0, url.lastIndexOf('/'));
    console.log('Card:', url);
    flashMessage(card, 'Copied: ');

    chrome.extension.sendMessage({ text: url });
  }

  function moveCardUp() {
    if(card.length !== 1) return;

    card.find('span.list-card-operation').trigger('click');
    elm = document.querySelector('a.js-move-card');

    elm.click();
    $('.js-select-position').children().first().attr('selected', 'selected');
    $('input[value="Move"]').click();
  }

  function notifications() {
    document.querySelector('.header-notifications.js-open-header-notifications-menu').click();
  }

  function scrollTop() {
    var cardList = $(':hover').last().parents('.list').children('.list-cards');
    if(cardList){
      cardList.scrollTop(0);
    }
  }

  function scrollBottom() {
    var cardList = $(':hover').last().parents('.list').children('.list-cards');
    if(cardList){
      cardList.scrollTop(cardList.height() + 500); //Just to make sure we get the entire height
    }
  }

  function flashMessage(card, message){
    var position = card.offset();
    $('body').append('<div id="floatingDiv">' + message + '</div>');
    $("#floatingDiv").css({
      "position": "absolute",
      "top": position.top + 5,
      "left": position.left + (card.width() / 3),
      "color": "white",
      "background-color": "rgba(40, 50, 75, 0.65)",
      "padding": "5px",
      "display": "block",
      "z-index": 9999
    })
    .fadeIn(function(){
      $("#floatingDiv").fadeOut(function(){
        $("#floatingDiv").remove();
      })
    });
  }

  function collapseList(){
    var cardList = $(':hover').last().parents('.list');
    if(!cardList){
        return;
    }

    var prevHeight = cardList.attr('prevHeight');
    if(prevHeight){
      cardList.animate({ height: prevHeight});
      cardList.removeAttr('prevHeight');
    }
    else {
      var height = cardList.height();
      cardList.attr('prevHeight', height);
      cardList.animate({ height: '67px'});
    }
  }

  // I thought there was a bug with double selections at first, but doesn't seem
  // like this is actually needed?
  var clearSelectedOptions = function($elem) {
    _.each($elem, function(child) {
      $(child).removeAttr('selected');
    });
  };

  var moveCardToList = function(curCard, listName, position = 1) {
    if (curCard.length !== 1) return;

    curCard.find('span.list-card-operation').trigger('click');
    var moveButton = document.querySelector('a.js-move-card');
    moveButton.click();

    if (typeof(listName) === 'string') {
      // Select the list in the move dropdown
      var $doneOption = $('.js-select-list option:contains("' + listName + '")');
      $doneOption.attr('selected', 'selected');
    }

    if (typeof(position) === 'number') {
      // Move to appropriate position
      var $positionOptions = $('.js-select-position option');

      // Cap the position to the list length, and subtract 1 for 0-index
      var positionIndex = Math.min(position, $positionOptions.length) - 1;

      var $positionOption = $($positionOptions[positionIndex])
      $positionOption.attr('selected', 'selected');
    }

    // Perform the move
    $('input[value="Move"]').click();
  };

  var moveCardDown = function(curCard) {
    if (curCard.length !== 1) return;

    curCard.find('span.list-card-operation').trigger('click');
    elm = document.querySelector('a.js-move-card');

    elm.click();
    $('.js-select-position').children().last().attr('selected', 'selected');
    $('input[value="Move"]').click();
  };

  // Sets the focus (.active-card) to the given card
  var setActiveCard = function($card) {
    // Let the DOM settle first
    setTimeout(function() {
      // First unselect all other .active-card's
      $('.active-card').removeClass('active-card');
      $card.addClass('active-card');
    }, 0);
  };

  var DONE_LIST_NAME = 'Done';
  var moveCardToDoneCommand = function() {
    var $curCard = $('.active-card');
    var $nextCardInList = $curCard.next();

    moveCardToList($curCard, DONE_LIST_NAME);

    $curCard = $('.active-card');
    moveCardDown($curCard);

    setActiveCard($nextCardInList);
  };

  var moveCardToListCommand = function() {
    var listName = window.prompt('Move to list name (case-insensitive substring):');
    if (typeof(listName) !== 'string' || listName === '') return;

    var $curCard = $('.active-card');
    var $nextCardInList = $curCard.next();

    // Move card to target list
    moveCardToList($curCard, listName);

    // Grab the card again, since it moved
    $curCard = $('.active-card');

    // Sort the card in new list by priority
    var position = getSortedPosition($curCard);
    moveCardToList($curCard, null, position);

    // Focus the next card in original list
    setActiveCard($nextCardInList);
  };

  var moveCardToPositionCommand = function() {
    var positionString = window.prompt('Move to position:');
    if (typeof(positionString) !== 'string' || positionString === '') return;

    var $curCard = $('.active-card');
    var $nextCardInList = $curCard.next();

    var position = parseInt(positionString);
    moveCardToList($curCard, null, position);
    setActiveCard($nextCardInList);
  };

  var getIndexOfFirstLabel = function($labelsElems, $targetLabelElem) {
    var label = $targetLabelElem.prop('title');
    var offset = 0;

    var index = _.findIndex($labelsElems, function(labelsElem) {
      var $labelElems = $(labelsElem).find('.card-label');

      return _.any($labelElems, function(labelElem) {
        var $labelElem = $(labelElem);

        // Skip self. Need to compare the raw DOM elements
        if ($labelElem[0] == $targetLabelElem[0]) {
          // Since we've passed this card itself, we need to offset the final
          // position to account for this card being moved.
          offset = -1;
          return false;
        }

        return $labelElem.prop('title') === label;
      });
    });

    return (index === -1) ? null : index + offset;
  };

  // Return 1-indexed sorted position
  var getSortedPosition = function($card) {
    var $labelsElems = $card.parent().find('.list-card-labels');
    var $targetLabelElem = $($card.find('.card-label')[0])

    var positionIndex = getIndexOfFirstLabel($labelsElems, $targetLabelElem);

    return (positionIndex === null) ? null : positionIndex + 1;
  };

  var sortCardByLabelCommand = function() {
    var $curCard = $('.active-card');
    var $nextCardInList = $curCard.next();

    var position = getSortedPosition($curCard);
    if (position === null) return;

    moveCardToList($curCard, null, position);
    setActiveCard($nextCardInList);
  };
});
