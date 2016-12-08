'use strict'

var $ = window.jQuery
var getStyles = require('./lib/dom/styles/get-styles')

module.exports = {
  collapsedSelectionInASpanOnNodeChange: collapsedSelectionInASpanOnNodeChange,
  spanInAParagraphOnNodeChange: spanInAParagraphOnNodeChange,
  spanFontConfigDefinedOnNodeChange: spanFontConfigDefinedOnNodeChange,
  checkAllOnSetContent: checkAllOnSetContent,
  eachSpanWrappedInAParagraph: eachSpanWrappedInAParagraph
}

/**
 * Force an Element without children to be wrapped in a SPAN on selected (when NodeChange is fired on it with collapsed selection)
 * @method
 * @static
 * @param {Event} evt The event object
 * @returns {undefined}
 */
function collapsedSelectionInASpanOnNodeChange (evt) {
  collapsedSelectionInASpan(evt.target, evt.element, evt.parents)
}

/**
 * Force a span to be wrapped in a paragraph on selected (when NodeChange is fired on it)
 * @method
 * @static
 * @param {Event} evt The event object
 * @returns {undefined}
 */
function spanInAParagraphOnNodeChange (evt) {
  var editor = evt.target
  var parents = evt.parents
  spanInAParagraph(editor, parents)
}

/**
 * Force a span to be font family and font size defined on selected (when NodeChange is fired on it)
 * @method
 * @static
 * @param {Event} evt The event object
 * @returns {undefined}
 */
function spanFontConfigDefinedOnNodeChange (evt) {
  spanFontConfigDefined(evt.target, evt.element)
}

function checkAllOnSetContent (evt) {
  console.log('checkAllOnSetContent', evt)
  if (evt.type === 'setcontent' && evt.format === 'html' && evt.content.trim() && evt.set) {
    // var editor = evt.target
    // var body = editor.getBody()
  }
}

/**
* Force each SPAN element in the doc to be wrapped in a Paragraph element
* @method
* @static
*/
function eachSpanWrappedInAParagraph (evt) {
  var editor = evt.target
  var body = editor.getBody()
  var $span = $('span', body)
  console.log(evt.type, evt)
  console.log('$span', $span)
  // console.log('editor', editor)
}

/**
 * Force an Element without children to be wrapped in a SPAN
 * @function
 * @inner
 * @param {Editor} editor The tinymce active editor
 * @param {Element} element The element on which do the check
 * @param {NodeList} parents The parents of the element
 */
function collapsedSelectionInASpan (editor, element, parents) {
  // ignore the uncollapsed selections
  if (editor.selection.isCollapsed() && !element.children.length) {
    var $element = $(element)
    var blockDisplays = ['block', 'inline-block', 'list-item', 'table-cell']
    var elementDisplay = getStyles.getComputed(element).display

    var $newSpan = createNewSpan(element, editor)
    if (element.tagName === 'BR' && $element.attr('data-mce-bogus') && parents[1].tagName !== 'SPAN') {
      // if we have something like <x><br data-mce-bogus/></x>
      // where X is not SPAN, we wrap the BR element by a SPAN element
      editor.undoManager.transact(function () {
        $element.wrap($newSpan)
      })
    } else if (~blockDisplays.indexOf(elementDisplay)) {
      // or if we are in a block, append a new span with a new bogus element into

      // create new SPAN and BR[bogus] elements
      var $newBogus = $('<br>').attr('data-mce-bogus', 1)

      editor.undoManager.transact(function () {
        // create the proper DOM tree, for example P>SPAN>BR
        var children = element.childNodes
        var nodeToSelect
        var lastChild = children[children.length - 1]
        if (children.length === 1 && lastChild.nodeName === '#text' && !lastChild.textContent.trim()) {
          element.removeChild(lastChild)
        }
        if (children.length) {
          $newSpan.wrapInner(children)
          nodeToSelect = $newSpan[0].lastChild
        } else {
          $newSpan.append($newBogus)
          nodeToSelect = $newBogus[0]
        }
        $element.append($newSpan)

        // and reset the cursor location into the newSpan
        editor.selection.select(nodeToSelect)
        editor.selection.collapse()
        editor.selection.setCursorLocation(nodeToSelect, 0)
      })
    }
  }
}

/**
 * Force an Element without children to be wrapped in a SPAN
 * @function
 * @inner
 * @param {Editor} editor The tinymce active editor
 * @param {NodeList} parents The parents of the element
 * @returns {Boolean} If the element has been wrapped
 */
function spanInAParagraph (editor, parents) {
  var blockDisplays = ['block', 'inline-block', 'table-cell']
  var wrapped = false
  $.each(parents, function () {
    if (this.nodeName === 'SPAN') {
      var element = this
      var $element = $(element)
      var $parentParagraph = $element.closest('p')
      if (!$parentParagraph.length) {
        var $newParagraph = $('<p>')
        $.each(parents, function (i) {
          if (!wrapped) {
            var itemDisplay = getStyles.getComputed(this).display
            if (~blockDisplays.indexOf(itemDisplay)) {
              editor.undoManager.transact(function () {
                $element.wrap($newParagraph)
              })
              wrapped = true
            }
          }
        })
      }
    }
  })
  return wrapped
}

/**
 * Force a span to be font family and font size defined
 * @function
 * @inner
 * @param {Editor} editor The tinymce active editor
 * @param {Element} element The element on which do the check
 * @returns {Boolean} If the element's style has changed
 */
function spanFontConfigDefined (editor, element) {
  if (element.nodeName === 'SPAN') {
    // var computedStyle = getStyles.getComputed(element)
    var closestFontConfig
    if (!element.style.fontFamily || !element.style.fontSize) {
      editor.undoManager.transact(function () {
        if (!element.style.fontFamily) {
          closestFontConfig = getStyles.getClosestFontConfig(element, 'Calibri', '12pt', editor)
          element.style.fontFamily = closestFontConfig.fontFamily
        }
        if (!element.style.fontSize) {
          if (!closestFontConfig) {
            closestFontConfig = getStyles.getClosestFontConfig(element, 'Calibri', '12pt', editor)
          }
          element.style.fontSize = closestFontConfig.fontSize
        }
      })
      return true
    } else {
      return false
    }
  }
}

/**
 * Create a new SPAN with the closest font config
 * @function
 * @inner
 * @param {Element} closestElement An element to search from the closest font config
 * @returns {jQuery} the new SPAN as a jQuery object
 */
function createNewSpan (closestElement, editor) {
  var closestFontConfig = getStyles.getClosestFontConfig(closestElement, 'Calibri', '12pt', editor)
  return $('<span>').attr('style', 'font-family: ' + closestFontConfig.fontFamily + '; font-size:' + closestFontConfig.fontSize)
}
