/*
    Bottom Overview
    GNOME Shell 46+ extension
    @fthx 2026
*/


import Clutter from 'gi://Clutter';
import GLib from 'gi://GLib';
import GObject from 'gi://GObject';
import Meta from 'gi://Meta';
import Shell from 'gi://Shell';

import * as Layout from 'resource:///org/gnome/shell/ui/layout.js'
import * as Main from 'resource:///org/gnome/shell/ui/main.js';


const PRESSURE_THRESHOLD = 150; // px
const HOT_EDGE_PRESSURE_TIMEOUT = 1000; // ms

const BottomOverview = GObject.registerClass(
    class BottomOverview extends Clutter.Actor {
        _init() {
            super._init();

            this._initPressureBarrier();
            this._setHotEdges();

            Main.layoutManager.connectObject('monitors-changed', () => this._setHotEdges(), this);
        }

        _initPressureBarrier() {
            this._pressureBarrier = new Layout.PressureBarrier(
                PRESSURE_THRESHOLD,
                HOT_EDGE_PRESSURE_TIMEOUT,
                Shell.ActionMode.NORMAL | Shell.ActionMode.OVERVIEW);

            this._pressureBarrier?.connectObject('trigger', () => this._toggleOverview(), this);
        }

        _toggleOverview() {
            const monitor = Main.layoutManager.primaryMonitor;

            if (Main.overview.shouldToggleByCornerOrButton()
                && !(global.get_pointer()[2] & Clutter.ModifierType.BUTTON1_MASK)
                && !monitor?.inFullscreen)
                Main.overview.toggle();
        }

        _setHotEdges() {
            this._destroyBarriers();

            if (this._hotEdgesTimeout)
                GLib.Source.remove(this._hotEdgesTimeout);

            this._hotEdgesTimeout = GLib.idle_add(GLib.PRIORITY_DEFAULT, () => {
                this._setBarriers();

                this._hotEdgesTimeout = null;
                return GLib.SOURCE_REMOVE;
            });
        }

        _setBarriers() {
            const monitors = Main.layoutManager.monitors;

            if (!monitors)
                return;

            for (const monitor of monitors) {
                const { width: width, height: height, x, y } = monitor;

                let hasBottom = true;

                for (const otherMonitor of monitors) {
                    if (!otherMonitor || otherMonitor === monitor)
                        continue;

                    if (otherMonitor.y >= y + height
                        && otherMonitor.x < x + width
                        && otherMonitor.x + otherMonitor.width > x)
                        hasBottom = false;
                }

                if (hasBottom) {
                    const barrier = new Meta.Barrier({
                        backend: global.backend,
                        x1: x,
                        y1: y + height,
                        x2: x + width,
                        y2: y + height,
                        directions: Meta.BarrierDirection.NEGATIVE_Y
                    });

                    this._pressureBarrier?.addBarrier(barrier);
                }
            }
        }

        _destroyBarriers() {
            while (this._pressureBarrier?._barriers.length > 0) {
                const barrier = this._pressureBarrier?._barriers[0];

                this._pressureBarrier?.removeBarrier(barrier);
                barrier.destroy();
            }
        }

        _destroyPressureBarrier() {
            this._pressureBarrier?.disconnectObject(this);
            this._pressureBarrier?.destroy();
            this._pressureBarrier = null;
        }

        destroy() {
            if (this._hotEdgesTimeout) {
                GLib.Source.remove(this._hotEdgesTimeout);
                this._hotEdgesTimeout = null;
            }

            Main.layoutManager.disconnectObject(this);

            this._destroyBarriers();
            this._destroyPressureBarrier();

            super.destroy();
        }
    });

export default class BottomOverviewExtension {
    _initBottomOverview() {
        this._bottomOverview = new BottomOverview();
    }

    enable() {
        if (Main.layoutManager._startingUp)
            Main.layoutManager.connectObject('startup-complete', () => this._initBottomOverview(), this);
        else
            this._initBottomOverview();
    }

    disable() {
        Main.layoutManager.disconnectObject(this);

        this._bottomOverview?.destroy();
        this._bottomOverview = null;
    }
}
