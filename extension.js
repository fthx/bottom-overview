/*
    Bottom Overview
    GNOME Shell 45+ extension
    Copyright @fthx 2025
    Adapted from @jdoda's Hot Edge and GNOME Shell's layout.js
    License GPL v3
*/


import Clutter from 'gi://Clutter';
import GObject from 'gi://GObject';
import Meta from 'gi://Meta';
import Shell from 'gi://Shell';

import * as Layout from 'resource:///org/gnome/shell/ui/layout.js'
import * as Main from 'resource:///org/gnome/shell/ui/main.js';


const HOT_EDGE_PRESSURE_TIMEOUT = 1000; // ms
const PRESSURE_TRESHOLD = 150;
const EDGE_SIZE = 100; // %


const BottomOverview = GObject.registerClass(
class BottomOverview extends Clutter.Actor {
    _init(monitor, x, y) {
        super._init();

        this._monitor = monitor;
        this._x = x;
        this._y = y;

        this._edgeSize = EDGE_SIZE / 100;
        this._pressureThreshold = PRESSURE_TRESHOLD;

        this._pressureBarrier = new Layout.PressureBarrier(
            this._pressureThreshold,
            HOT_EDGE_PRESSURE_TIMEOUT,
            Shell.ActionMode.NORMAL | Shell.ActionMode.OVERVIEW);

        this._pressureBarrier?.connectObject('trigger', this._toggleOverview.bind(this), this);
        this.connectObject('destroy', this._destroy.bind(this), this);
    }

    setBarrierSize(size) {
        if (this._barrier) {
            this._pressureBarrier?.removeBarrier(this._barrier);
            this._barrier.destroy();
            this._barrier = null;
        }

        if (size > 0) {
            size = this._monitor.width * this._edgeSize;
            let x_offset = (this._monitor.width - size) / 2;

            this._barrier = new Meta.Barrier({
                backend: global.backend,
                x1: this._x + x_offset, x2: this._x + x_offset + size,
                y1: this._y, y2: this._y,
                directions: Meta.BarrierDirection.NEGATIVE_Y});
            this._pressureBarrier?.addBarrier(this._barrier);
        }
    }

    vfunc_leave_event(event) {
        return Clutter.EVENT_PROPAGATE;
    }

    _toggleOverview() {
        if (Main.overview.shouldToggleByCornerOrButton()
                && !(global.get_pointer()[2] & Clutter.ModifierType.BUTTON1_MASK)
                && !this._monitor.inFullscreen)
            Main.overview.toggle();
    }

    _destroy() {
        this.setBarrierSize(0);

        this._pressureBarrier?.disconnectObject(this);
        this._pressureBarrier?.destroy();
        this._pressureBarrier = null;

        super.destroy();
    }
});

export default class BottomOverviewExtension {
    _updateHotEdges() {
        Main.layoutManager._destroyHotCorners();

        for (let i = 0; i < Main.layoutManager.monitors.length; i++) {
            let monitor = Main.layoutManager.monitors[i];
            let leftX = monitor.x;
            let rightX = monitor.x + monitor.width;
            let bottomY = monitor.y + monitor.height;
            let size = monitor.width;

            let haveBottom = true;

            for (let j = 0; j < Main.layoutManager.monitors.length; j++) {
                if (j != i) {
                    let otherMonitor = Main.layoutManager.monitors[j];
                    let otherLeftX = otherMonitor.x;
                    let otherRightX = otherMonitor.x + otherMonitor.width;
                    let otherTopY = otherMonitor.y;
                    if (otherTopY >= bottomY && otherLeftX < rightX && otherRightX > leftX)
                        haveBottom = false;
                }
            }

            if (haveBottom) {
                let edge = new BottomOverview(monitor, leftX, bottomY);

                edge.setBarrierSize(size);
                Main.layoutManager.hotCorners.push(edge);
            } else
                Main.layoutManager.hotCorners.push(null);
        }
    }

    enable() {
        Main.layoutManager.connectObject('hot-corners-changed', this._updateHotEdges.bind(this), this);
        this._updateHotEdges();
    }

    disable() {
        Main.layoutManager.disconnectObject(this);
        Main.layoutManager._updateHotCorners();
    }
}
