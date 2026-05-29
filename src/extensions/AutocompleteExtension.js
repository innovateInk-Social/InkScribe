import { Extension } from '@tiptap/core';
import { Plugin, PluginKey } from '@tiptap/pm/state';
import { Decoration, DecorationSet } from '@tiptap/pm/view';

export const AutocompletePluginKey = new PluginKey('autocomplete');

export const AutocompleteExtension = Extension.create({
  name: 'autocomplete',

  // Ensure this has a high priority so it intercepts Tab before anything else
  priority: 2000, 

  addKeyboardShortcuts() {
    return {
      Tab: ({ editor }) => {
        const state = AutocompletePluginKey.getState(editor.state);
        if (state && state.find().length > 0) {
          const deco = state.find()[0];
          const suggestionText = deco.type.spec.suggestionText;
          
          if (suggestionText) {
            const startPos = editor.state.selection.head;
            const endPos = startPos + suggestionText.length;
            
            // Insert the text at the cursor with the aiGenerated mark and clear the suggestion
            editor.view.dispatch(
              editor.state.tr
                .insertText(suggestionText, startPos)
                .addMark(startPos, endPos, editor.state.schema.marks.aiGenerated.create())
                .setMeta('autocompleteSuggestion', null)
                .setMeta('autocompleteAccepted', true)
            );
            return true; // Stop default tab behavior and propagation
          }
        }
        return false;
      },
      Escape: ({ editor }) => {
        const state = AutocompletePluginKey.getState(editor.state);
        if (state && state.find().length > 0) {
          editor.view.dispatch(editor.state.tr.setMeta('autocompleteSuggestion', null));
          return true;
        }
        return false;
      }
    };
  },

  addProseMirrorPlugins() {
    return [
      new Plugin({
        key: AutocompletePluginKey,
        state: {
          init() { return DecorationSet.empty; },
          apply(tr, oldState) {
            let nextState = oldState.map(tr.mapping, tr.doc);

            if (tr.docChanged && !tr.getMeta('autocompleteSuggestionSet')) {
              return DecorationSet.empty;
            }

            const suggestionText = tr.getMeta('autocompleteSuggestion');
            
            if (suggestionText === null) {
              return DecorationSet.empty;
            }

            if (suggestionText) {
              const deco = Decoration.widget(tr.selection.$head.pos, () => {
                const container = document.createElement('span');
                container.className = 'autocomplete-ghost-container';
                
                // Ghost text
                const textSpan = document.createElement('span');
                textSpan.innerText = suggestionText;
                container.appendChild(textSpan);
                
                // Tab Key badge
                const tabBadge = document.createElement('span');
                tabBadge.className = 'autocomplete-tab-badge';
                tabBadge.innerText = 'Tab';
                container.appendChild(tabBadge);
                
                return container;
              }, { side: 1, suggestionText });
              return DecorationSet.create(tr.doc, [deco]);
            }
            
            return nextState;
          }
        },
        props: {
          decorations(state) {
            return this.getState(state);
          },
          handleKeyDown(view, event) {
            // If they press any other key (except modifiers), clear the suggestion
            if (
              event.key !== 'Tab' && 
              event.key !== 'Escape' && 
              (event.key.length === 1 || event.key === 'Backspace' || event.key === 'Enter')
            ) {
               const state = this.getState(view.state);
               if (state && state.find().length > 0) {
                 view.dispatch(view.state.tr.setMeta('autocompleteSuggestion', null));
               }
            }
            return false;
          }
        }
      })
    ];
  }
});
