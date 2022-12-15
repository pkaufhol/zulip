import { MessageList } from "./message_list";
import {MessageListView} from "./message_list_view";
import * as narrow_banner from "./narrow_banner";
import * as narrow_state from "./narrow_state";
import {page_params} from "./page_params";
import * as stream_data from "./stream_data";

export class HomeMessageList extends MessageList {
    constructor(opts) {
        super(opts)
        this.table_name = "zhome";
        const collapse_messages = this.data.filter.supports_collapsing_recipients();
        this.view = new MessageListView(this, this.table_name, collapse_messages);
        this.narrowed = false;
        // this.current set as true initially in case we start on All messages after initializing
        this.current = true;
        return this;
    }

    set_current_message_list(current) {
        this.current = current;
    }

    handle_empty_narrow_banner() {
        if (this.current) {
            if (this.empty()) {
                narrow_banner.show_empty_narrow_message();
            } else {
                narrow_banner.hide_empty_narrow_message();
            }
        }
    }

    add_messages(messages, opts) {
        // This adds all messages to our data, but only returns
        // the currently viewable ones.
        const info = this.data.add_messages(messages);

        const top_messages = info.top_messages;
        const bottom_messages = info.bottom_messages;
        const interior_messages = info.interior_messages;

        // Currently we only need data back from rendering to
        // tell us whether users needs to scroll, which only
        // applies for `append_to_view`, but this may change over
        // time.
        let render_info;

        if (interior_messages.length > 0) {
            this.view.rerender_preserving_scrolltop(true);
            return true;
        }
        if (top_messages.length > 0) {
            this.view.prepend(top_messages);
        }

        if (bottom_messages.length > 0) {
            render_info = this.append_to_view(bottom_messages, opts);
        }

        if (this.current && !this.empty() && this.selected_id() === -1) {
            // And also select the newly arrived message.
            this.select_id(this.selected_id(), {then_scroll: true, use_closest: true});
        }

        this.handle_empty_narrow_banner();
        return render_info;
    }

    // Maintains a trailing bookend element explaining any changes in
    // your subscribed/unsubscribed status at the bottom of the
    // message list.
    update_trailing_bookend() {
        this.view.clear_trailing_bookend();
        if (!this.current) {
            return;
        }
        const stream_name = narrow_state.stream();
        if (stream_name === undefined) {
            return;
        }

        let deactivated = false;
        let just_unsubscribed = false;
        const subscribed = stream_data.is_subscribed_by_name(stream_name);
        const sub = stream_data.get_sub(stream_name);
        const can_toggle_subscription =
            sub !== undefined && stream_data.can_toggle_subscription(sub);
        if (sub === undefined) {
            deactivated = true;
        } else if (!subscribed && !this.last_message_historical) {
            just_unsubscribed = true;
        }
        this.view.render_trailing_bookend(
            stream_name,
            subscribed,
            deactivated,
            just_unsubscribed,
            can_toggle_subscription,
            page_params.is_spectator,
        );
    }

    rerender() {
        this.handle_empty_narrow_banner();
        super.rerender();
    }

}
