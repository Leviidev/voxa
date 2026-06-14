package com.voxa.app

import android.app.Application
import android.content.Context
import androidx.datastore.core.DataStore
import androidx.datastore.preferences.core.Preferences
import androidx.datastore.preferences.preferencesDataStore

val Context.dataStore: DataStore<Preferences> by preferencesDataStore(name = "voxa_prefs")

class VoxaApplication : Application() {
    override fun onCreate() {
        super.onCreate()
    }
}
