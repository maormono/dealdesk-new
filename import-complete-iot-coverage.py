#!/usr/bin/env python3
"""
Complete IoT coverage import from Monogoto documentation
Including ALL countries, especially Israel
Profile mapping: B = Tele2, E = A1, O = Telefonica, P = not in our system, C = not in our system
"""

import requests
import json

SUPABASE_URL = "https://uddmjjgnexdazfedrytt.supabase.co"
SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVkZG1qamduZXhkYXpmZWRyeXR0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDc3NjQ2OTUsImV4cCI6MjA2MzM0MDY5NX0.A_034WOQ-JJ3DDvMux5fLXayJ4pUk3_WXnVTJI-wSL0"

headers = {
    'apikey': SUPABASE_KEY,
    'Authorization': f'Bearer {SUPABASE_KEY}',
    'Content-Type': 'application/json'
}

# COMPLETE IoT coverage from Monogoto docs
# Note: P and C profiles are not in our system, but B, E, O are
COMPLETE_IOT_COVERAGE = {
    # ISRAEL - Critical addition
    'Israel': {
        'Pelephone': {'tadig': 'ISRPL', 'lte_m': ['B', 'E'], 'nb_iot': ['B']},
        'Partner/Orange': {'tadig': 'ISR01', 'lte_m': ['B', 'E'], 'nb_iot': ['B', 'E']},
        'Cellcom': {'tadig': 'ISRCL', 'lte_m': ['E'], 'nb_iot': []},
        'Hot Mobile': {'tadig': 'ISRMS', 'lte_m': ['B'], 'nb_iot': []},
    },
    
    # Complete list from Monogoto docs
    'Argentina': {
        'Claro': {'tadig': 'ARGCM', 'lte_m': ['B'], 'nb_iot': ['B']},
        'Personal': {'tadig': 'ARGTP', 'lte_m': ['B'], 'nb_iot': ['B']},
        'Movistar': {'tadig': 'ARGTM', 'lte_m': ['B'], 'nb_iot': ['B']},
    },
    'Australia': {
        'Telstra': {'tadig': 'AUSTA', 'lte_m': ['B', 'E', 'O'], 'nb_iot': ['B', 'E', 'O']},
        'Optus': {'tadig': 'AUSOP', 'lte_m': ['B', 'E', 'O'], 'nb_iot': ['B', 'E', 'O']},
        'Vodafone': {'tadig': 'AUSVF', 'lte_m': ['B', 'E', 'O'], 'nb_iot': ['B', 'E', 'O']},
    },
    'Austria': {
        'T-Mobile': {'tadig': 'AUTMM', 'lte_m': ['E'], 'nb_iot': ['E']},
        'A1': {'tadig': 'AUTMB', 'lte_m': ['B', 'E'], 'nb_iot': ['B', 'E']},
        'Hutchison 3G': {'tadig': 'AUTH3', 'lte_m': ['B'], 'nb_iot': ['B']},
    },
    'Belgium': {
        'Telenet': {'tadig': 'BELNT', 'lte_m': ['B', 'E'], 'nb_iot': ['B', 'E']},
        'Orange': {'tadig': 'BELMS', 'lte_m': ['B', 'E'], 'nb_iot': ['B', 'E']},
        'Proximus': {'tadig': 'BELPB', 'lte_m': ['B', 'E'], 'nb_iot': ['B', 'E']},
    },
    'Brazil': {
        'Claro': {'tadig': 'BRACL', 'lte_m': ['B'], 'nb_iot': ['B']},
        'TIM': {'tadig': 'BRATM', 'lte_m': ['B'], 'nb_iot': ['B']},
        'Vivo': {'tadig': 'BRAVC', 'lte_m': ['B'], 'nb_iot': ['B']},
    },
    'Bulgaria': {
        'A1': {'tadig': 'BGRMT', 'lte_m': ['E'], 'nb_iot': ['E']},
        'Vivacom': {'tadig': 'BGRVT', 'lte_m': ['B'], 'nb_iot': ['B']},
        'Telenor': {'tadig': 'BGRGB', 'lte_m': ['B', 'E'], 'nb_iot': ['B', 'E']},
    },
    'Canada': {
        'Rogers': {'tadig': 'CANRW', 'lte_m': ['B', 'E'], 'nb_iot': ['B', 'E']},
        'Bell Mobility': {'tadig': 'CANBM', 'lte_m': ['B', 'E'], 'nb_iot': ['B', 'E']},
        'Telus': {'tadig': 'CANTS', 'lte_m': ['B', 'E'], 'nb_iot': []},
        'Videotron': {'tadig': 'CANVT', 'lte_m': ['E'], 'nb_iot': []},
    },
    'Chile': {
        'Claro': {'tadig': 'CHLSA', 'lte_m': ['B'], 'nb_iot': ['B']},
        'Entel': {'tadig': 'CHLEN', 'lte_m': ['B'], 'nb_iot': ['B']},
        'Movistar': {'tadig': 'CHLSM', 'lte_m': ['B'], 'nb_iot': ['B']},
    },
    'China': {
        'China Mobile': {'tadig': 'CHN00', 'lte_m': ['B', 'E'], 'nb_iot': ['B', 'E']},
        'China Unicom': {'tadig': 'CHN01', 'lte_m': ['B', 'E'], 'nb_iot': ['B', 'E']},
        'China Telecom': {'tadig': 'CHN03', 'lte_m': ['B'], 'nb_iot': ['B']},
    },
    'Croatia': {
        'A1': {'tadig': 'HRVVP', 'lte_m': ['E'], 'nb_iot': ['E']},
        'T-Mobile': {'tadig': 'HRVHT', 'lte_m': ['B', 'E'], 'nb_iot': ['B', 'E']},
        'Tele2': {'tadig': 'HRV02', 'lte_m': ['B'], 'nb_iot': []},
    },
    'Czech Republic': {
        'T-Mobile': {'tadig': 'CZETM', 'lte_m': ['B', 'E'], 'nb_iot': ['B', 'E']},
        'O2': {'tadig': 'CZEO2', 'lte_m': ['B', 'E'], 'nb_iot': ['B', 'E']},
        'Vodafone': {'tadig': 'CZEVF', 'lte_m': ['B', 'E'], 'nb_iot': ['B', 'E']},
    },
    'Denmark': {
        'Hi3G': {'tadig': 'DNK3D', 'lte_m': ['B', 'E'], 'nb_iot': ['B', 'E']},
        'TDC': {'tadig': 'DNKTD', 'lte_m': ['B', 'E'], 'nb_iot': ['B', 'E']},
        'Telia': {'tadig': 'DNKSN', 'lte_m': ['B', 'E'], 'nb_iot': ['B', 'E']},
        'Telenor': {'tadig': 'DNKDM', 'lte_m': ['B', 'E'], 'nb_iot': ['B', 'E']},
    },
    'Estonia': {
        'Telia': {'tadig': 'ESTMT', 'lte_m': ['B', 'E'], 'nb_iot': ['B', 'E']},
        'Elisa': {'tadig': 'ESTRE', 'lte_m': ['B', 'E'], 'nb_iot': ['B', 'E']},
        'Tele2': {'tadig': 'ESTEL', 'lte_m': ['B', 'E'], 'nb_iot': ['B', 'E']},
    },
    'Finland': {
        'DNA': {'tadig': 'FIN2G', 'lte_m': ['B', 'E'], 'nb_iot': ['B', 'E']},
        'Elisa': {'tadig': 'FINRL', 'lte_m': ['B', 'E'], 'nb_iot': ['B', 'E']},
        'Telia': {'tadig': 'FINSX', 'lte_m': ['B', 'E'], 'nb_iot': ['B', 'E']},
    },
    'France': {
        'Orange': {'tadig': 'FRAF1', 'lte_m': ['B', 'E', 'O'], 'nb_iot': ['B', 'E', 'O']},
        'SFR': {'tadig': 'FRAF2', 'lte_m': ['B', 'E', 'O'], 'nb_iot': ['B', 'E', 'O']},
        'Bouygues': {'tadig': 'FRAF3', 'lte_m': ['B', 'E', 'O'], 'nb_iot': ['B', 'E', 'O']},
        'Free': {'tadig': 'FRAF4', 'lte_m': ['E'], 'nb_iot': ['E']},
    },
    'Germany': {
        'T-Mobile': {'tadig': 'DEUTM', 'lte_m': ['B', 'E', 'O'], 'nb_iot': ['B', 'E', 'O']},
        'Vodafone': {'tadig': 'DEUMV', 'lte_m': ['B', 'E', 'O'], 'nb_iot': ['B', 'E', 'O']},
        'O2': {'tadig': 'DEUVI', 'lte_m': ['B', 'E', 'O'], 'nb_iot': ['B', 'E', 'O']},
    },
    'Greece': {
        'Cosmote': {'tadig': 'GRCCO', 'lte_m': ['B', 'E'], 'nb_iot': ['B', 'E']},
        'Vodafone': {'tadig': 'GRCPF', 'lte_m': ['B', 'E'], 'nb_iot': ['B', 'E']},
        'Wind': {'tadig': 'GRCQT', 'lte_m': ['B'], 'nb_iot': ['B']},
    },
    'Hong Kong': {
        'CSL': {'tadig': 'HKGN1', 'lte_m': ['B', 'E'], 'nb_iot': ['B', 'E']},
        'Hutchison': {'tadig': 'HKGHT', 'lte_m': ['B', 'E'], 'nb_iot': ['B', 'E']},
        'SmarTone': {'tadig': 'HKGSM', 'lte_m': ['B', 'E'], 'nb_iot': ['B', 'E']},
        'CMHK': {'tadig': 'HKGCM', 'lte_m': ['B', 'E'], 'nb_iot': ['B', 'E']},
    },
    'Hungary': {
        'T-Mobile': {'tadig': 'HUNTM', 'lte_m': ['B', 'E'], 'nb_iot': ['B', 'E']},
        'Telenor': {'tadig': 'HUNPN', 'lte_m': ['B', 'E'], 'nb_iot': ['B', 'E']},
        'Vodafone': {'tadig': 'HUNVF', 'lte_m': ['B', 'E'], 'nb_iot': ['B', 'E']},
    },
    'Iceland': {
        'Nova': {'tadig': 'ISLNO', 'lte_m': ['B', 'E'], 'nb_iot': ['B', 'E']},
        'Siminn': {'tadig': 'ISLTS', 'lte_m': ['B', 'E'], 'nb_iot': ['B', 'E']},
        'Vodafone': {'tadig': 'ISLTL', 'lte_m': ['B', 'E'], 'nb_iot': ['B', 'E']},
    },
    'India': {
        'Bharti Airtel': {'tadig': 'IND40', 'lte_m': ['B'], 'nb_iot': ['B']},
        'Vodafone Idea': {'tadig': 'INDVF', 'lte_m': ['B'], 'nb_iot': ['B']},
        'Reliance Jio': {'tadig': 'INDJT', 'lte_m': ['B'], 'nb_iot': ['B']},
    },
    'Indonesia': {
        'Telkomsel': {'tadig': 'IDNST', 'lte_m': ['B'], 'nb_iot': ['B']},
        'Indosat': {'tadig': 'IDNIM', 'lte_m': ['B'], 'nb_iot': ['B']},
        'XL Axiata': {'tadig': 'IDNXA', 'lte_m': ['B'], 'nb_iot': ['B']},
        'Smartfren': {'tadig': 'IDNSF', 'lte_m': ['B'], 'nb_iot': ['B']},
    },
    'Ireland': {
        'Vodafone': {'tadig': 'IRLEC', 'lte_m': ['B', 'E'], 'nb_iot': ['B', 'E']},
        'Three': {'tadig': 'IRLH3', 'lte_m': ['B', 'E'], 'nb_iot': ['B', 'E']},
        'Eir': {'tadig': 'IRLMM', 'lte_m': ['B', 'E'], 'nb_iot': ['B', 'E']},
    },
    'Italy': {
        'TIM': {'tadig': 'ITATM', 'lte_m': ['B', 'E', 'O'], 'nb_iot': ['B', 'E', 'O']},
        'Vodafone': {'tadig': 'ITAOM', 'lte_m': ['B', 'E', 'O'], 'nb_iot': ['B', 'E', 'O']},
        'Wind Tre': {'tadig': 'ITAWI', 'lte_m': ['B', 'E', 'O'], 'nb_iot': ['B', 'E', 'O']},
        'Iliad': {'tadig': 'ITAIL', 'lte_m': ['E'], 'nb_iot': ['E']},
    },
    'Japan': {
        'NTT DoCoMo': {'tadig': 'JPNDC', 'lte_m': ['B', 'E'], 'nb_iot': ['B', 'E']},
        'KDDI': {'tadig': 'JPNKT', 'lte_m': ['B', 'E'], 'nb_iot': ['B', 'E']},
        'Softbank': {'tadig': 'JPNSB', 'lte_m': ['B', 'E'], 'nb_iot': ['B', 'E']},
    },
    'Latvia': {
        'LMT': {'tadig': 'LVALM', 'lte_m': ['B', 'E'], 'nb_iot': ['B', 'E']},
        'Tele2': {'tadig': 'LVAT2', 'lte_m': ['B', 'E'], 'nb_iot': ['B', 'E']},
        'Bite': {'tadig': 'LVABI', 'lte_m': ['B'], 'nb_iot': ['B']},
    },
    'Lithuania': {
        'Telia': {'tadig': 'LTUOM', 'lte_m': ['B', 'E'], 'nb_iot': ['B', 'E']},
        'Bite': {'tadig': 'LTUBT', 'lte_m': ['B', 'E'], 'nb_iot': ['B', 'E']},
        'Tele2': {'tadig': 'LTU02', 'lte_m': ['B', 'E'], 'nb_iot': ['B', 'E']},
    },
    'Luxembourg': {
        'POST': {'tadig': 'LUXPT', 'lte_m': ['B', 'E'], 'nb_iot': ['B', 'E']},
        'Tango': {'tadig': 'LUXTA', 'lte_m': ['B', 'E'], 'nb_iot': ['B', 'E']},
        'Orange': {'tadig': 'LUXOR', 'lte_m': ['B', 'E'], 'nb_iot': ['B', 'E']},
    },
    'Malaysia': {
        'Maxis': {'tadig': 'MYSMB', 'lte_m': ['B'], 'nb_iot': ['B']},
        'Celcom': {'tadig': 'MYSCA', 'lte_m': ['B'], 'nb_iot': ['B']},
        'Digi': {'tadig': 'MYSDG', 'lte_m': ['B'], 'nb_iot': ['B']},
        'U Mobile': {'tadig': 'MYSUM', 'lte_m': ['B'], 'nb_iot': ['B']},
    },
    'Malta': {
        'Vodafone': {'tadig': 'MLTVM', 'lte_m': ['B', 'E'], 'nb_iot': ['B', 'E']},
        'GO': {'tadig': 'MLTGO', 'lte_m': ['B', 'E'], 'nb_iot': ['B', 'E']},
        'Melita': {'tadig': 'MLT03', 'lte_m': ['B'], 'nb_iot': ['B']},
    },
    'Mexico': {
        'Telcel': {'tadig': 'MEXTA', 'lte_m': ['B'], 'nb_iot': ['B']},
        'AT&T': {'tadig': 'MEXNX', 'lte_m': ['B'], 'nb_iot': ['B']},
        'Movistar': {'tadig': 'MEXMS', 'lte_m': ['B'], 'nb_iot': ['B']},
    },
    'Netherlands': {
        'KPN': {'tadig': 'NLDPN', 'lte_m': ['B', 'E', 'O'], 'nb_iot': ['B', 'E', 'O']},
        'T-Mobile': {'tadig': 'NLDTM', 'lte_m': ['B', 'E', 'O'], 'nb_iot': ['B', 'E', 'O']},
        'Vodafone': {'tadig': 'NLDVF', 'lte_m': ['B', 'E', 'O'], 'nb_iot': ['B', 'E', 'O']},
    },
    'New Zealand': {
        'Spark': {'tadig': 'NZLNT', 'lte_m': ['B', 'E', 'O'], 'nb_iot': ['B', 'E', 'O']},
        'Vodafone': {'tadig': 'NZLVF', 'lte_m': ['B', 'E', 'O'], 'nb_iot': ['B', 'E', 'O']},
        '2degrees': {'tadig': 'NZL2D', 'lte_m': ['B', 'E'], 'nb_iot': ['B', 'E']},
    },
    'Norway': {
        'Telenor': {'tadig': 'NORTM', 'lte_m': ['B', 'E', 'O'], 'nb_iot': ['B', 'E', 'O']},
        'Telia': {'tadig': 'NORNT', 'lte_m': ['B', 'E', 'O'], 'nb_iot': ['B', 'E', 'O']},
        'Ice': {'tadig': 'NORIS', 'lte_m': ['B', 'E'], 'nb_iot': ['B', 'E']},
    },
    'Poland': {
        'Plus': {'tadig': 'POLKM', 'lte_m': ['B', 'E'], 'nb_iot': ['B', 'E']},
        'T-Mobile': {'tadig': 'POL02', 'lte_m': ['B', 'E'], 'nb_iot': ['B', 'E']},
        'Orange': {'tadig': 'POL03', 'lte_m': ['B', 'E'], 'nb_iot': ['B', 'E']},
        'Play': {'tadig': 'POLP4', 'lte_m': ['B', 'E'], 'nb_iot': ['B', 'E']},
    },
    'Portugal': {
        'MEO': {'tadig': 'PRTTM', 'lte_m': ['B', 'E'], 'nb_iot': ['B', 'E']},
        'Vodafone': {'tadig': 'PRTTL', 'lte_m': ['B', 'E'], 'nb_iot': ['B', 'E']},
        'NOS': {'tadig': 'PRTOP', 'lte_m': ['B', 'E'], 'nb_iot': ['B', 'E']},
    },
    'Romania': {
        'Orange': {'tadig': 'ROUMR', 'lte_m': ['B', 'E'], 'nb_iot': ['B', 'E']},
        'Vodafone': {'tadig': 'ROUCT', 'lte_m': ['B', 'E'], 'nb_iot': ['B', 'E']},
        'Telekom': {'tadig': 'ROUCR', 'lte_m': ['B', 'E'], 'nb_iot': ['B', 'E']},
        'Digi': {'tadig': 'ROURD', 'lte_m': ['B'], 'nb_iot': ['B']},
    },
    'Russia': {
        'MTS': {'tadig': 'RUS01', 'lte_m': ['B', 'E'], 'nb_iot': ['B', 'E']},
        'Beeline': {'tadig': 'RUS99', 'lte_m': ['B', 'E'], 'nb_iot': ['B', 'E']},
        'MegaFon': {'tadig': 'RUS02', 'lte_m': ['B', 'E'], 'nb_iot': ['B', 'E']},
        'Tele2': {'tadig': 'RUS20', 'lte_m': ['B'], 'nb_iot': ['B']},
    },
    'Singapore': {
        'Singtel': {'tadig': 'SGPSM', 'lte_m': ['B', 'E'], 'nb_iot': ['B', 'E']},
        'StarHub': {'tadig': 'SGPSH', 'lte_m': ['B', 'E'], 'nb_iot': ['B', 'E']},
        'M1': {'tadig': 'SGPM1', 'lte_m': ['B', 'E'], 'nb_iot': ['B', 'E']},
    },
    'Slovakia': {
        'Orange': {'tadig': 'SVKGT', 'lte_m': ['B', 'E'], 'nb_iot': ['B', 'E']},
        'T-Mobile': {'tadig': 'SVKET', 'lte_m': ['B', 'E'], 'nb_iot': ['B', 'E']},
        'O2': {'tadig': 'SVKTF', 'lte_m': ['B', 'E'], 'nb_iot': ['B', 'E']},
        '4ka': {'tadig': 'SVK04', 'lte_m': ['B'], 'nb_iot': ['B']},
    },
    'Slovenia': {
        'A1': {'tadig': 'SVNVG', 'lte_m': ['E'], 'nb_iot': ['E']},
        'Telekom': {'tadig': 'SVNMB', 'lte_m': ['B', 'E'], 'nb_iot': ['B', 'E']},
        'Telemach': {'tadig': 'SVNTS', 'lte_m': ['B'], 'nb_iot': ['B']},
    },
    'South Africa': {
        'Vodacom': {'tadig': 'ZAFVL', 'lte_m': ['B'], 'nb_iot': ['B']},
        'MTN': {'tadig': 'ZAFMN', 'lte_m': ['B'], 'nb_iot': ['B']},
        'Cell C': {'tadig': 'ZAFCC', 'lte_m': ['B'], 'nb_iot': ['B']},
        'Telkom': {'tadig': 'ZAF02', 'lte_m': ['B'], 'nb_iot': ['B']},
    },
    'South Korea': {
        'SK Telecom': {'tadig': 'KORSK', 'lte_m': ['B', 'E'], 'nb_iot': ['B', 'E']},
        'KT': {'tadig': 'KORKT', 'lte_m': ['B', 'E'], 'nb_iot': ['B', 'E']},
        'LG U+': {'tadig': 'KORLG', 'lte_m': ['B', 'E'], 'nb_iot': ['B', 'E']},
    },
    'Spain': {
        'Movistar': {'tadig': 'ESPRT', 'lte_m': ['B', 'E', 'O'], 'nb_iot': ['B', 'E', 'O']},
        'Vodafone': {'tadig': 'ESPAI', 'lte_m': ['B', 'E', 'O'], 'nb_iot': ['B', 'E', 'O']},
        'Orange': {'tadig': 'ESPAM', 'lte_m': ['B', 'E', 'O'], 'nb_iot': ['B', 'E', 'O']},
        'Yoigo': {'tadig': 'ESPXY', 'lte_m': ['E'], 'nb_iot': ['E']},
    },
    'Sweden': {
        'Telia': {'tadig': 'SWETS', 'lte_m': ['B', 'E', 'O'], 'nb_iot': ['B', 'E', 'O']},
        'Tele2': {'tadig': 'SWEMC', 'lte_m': ['B', 'E', 'O'], 'nb_iot': ['B', 'E', 'O']},
        'Telenor': {'tadig': 'SWETM', 'lte_m': ['B', 'E', 'O'], 'nb_iot': ['B', 'E', 'O']},
        'Three': {'tadig': 'SWEH3', 'lte_m': ['B', 'E'], 'nb_iot': ['B', 'E']},
    },
    'Switzerland': {
        'Swisscom': {'tadig': 'CHESL', 'lte_m': ['B', 'E', 'O'], 'nb_iot': ['B', 'E', 'O']},
        'Sunrise': {'tadig': 'CHESG', 'lte_m': ['B', 'E', 'O'], 'nb_iot': ['B', 'E', 'O']},
        'Salt': {'tadig': 'CHEOR', 'lte_m': ['B', 'E'], 'nb_iot': ['B', 'E']},
    },
    'Taiwan': {
        'Chunghwa': {'tadig': 'TWNCH', 'lte_m': ['B', 'E'], 'nb_iot': ['B', 'E']},
        'FarEasTone': {'tadig': 'TWNFR', 'lte_m': ['B', 'E'], 'nb_iot': ['B', 'E']},
        'Taiwan Mobile': {'tadig': 'TWNTM', 'lte_m': ['B', 'E'], 'nb_iot': ['B', 'E']},
        'Taiwan Star': {'tadig': 'TWNTS', 'lte_m': ['B'], 'nb_iot': ['B']},
    },
    'Thailand': {
        'AIS': {'tadig': 'THATS', 'lte_m': ['B'], 'nb_iot': ['B']},
        'DTAC': {'tadig': 'THATD', 'lte_m': ['B'], 'nb_iot': ['B']},
        'TrueMove': {'tadig': 'THATO', 'lte_m': ['B'], 'nb_iot': ['B']},
    },
    'Turkey': {
        'Turkcell': {'tadig': 'TURTC', 'lte_m': ['B'], 'nb_iot': ['B']},
        'Vodafone': {'tadig': 'TURVF', 'lte_m': ['B'], 'nb_iot': ['B']},
        'Turk Telekom': {'tadig': 'TURTT', 'lte_m': ['B'], 'nb_iot': ['B']},
    },
    'United Arab Emirates': {
        'Etisalat': {'tadig': 'AREE1', 'lte_m': ['B'], 'nb_iot': ['B']},
        'du': {'tadig': 'AREDU', 'lte_m': ['B'], 'nb_iot': ['B']},
    },
    'United Kingdom': {
        'EE': {'tadig': 'GBROR', 'lte_m': ['B', 'E', 'O'], 'nb_iot': ['B', 'E', 'O']},
        'O2': {'tadig': 'GBRCN', 'lte_m': ['B', 'E', 'O'], 'nb_iot': ['B', 'E', 'O']},
        'Vodafone': {'tadig': 'GBRVF', 'lte_m': ['B', 'E', 'O'], 'nb_iot': ['B', 'E', 'O']},
        'Three': {'tadig': 'GBRHU', 'lte_m': ['B', 'E', 'O'], 'nb_iot': ['B', 'E', 'O']},
    },
    'United States': {
        'AT&T': {'tadig': 'USACG', 'lte_m': ['B', 'E', 'O'], 'nb_iot': ['B', 'E', 'O']},
        'T-Mobile': {'tadig': 'USATW', 'lte_m': ['B', 'E', 'O'], 'nb_iot': ['B', 'E', 'O']},
        'Verizon': {'tadig': 'USAVZ', 'lte_m': ['B', 'E', 'O'], 'nb_iot': ['B', 'E', 'O']},
    },
}

def update_complete_iot_coverage():
    """Update database with COMPLETE IoT coverage from Monogoto"""
    
    print("🌐 COMPLETE IoT Coverage Import from Monogoto")
    print("=" * 60)
    print("Including ISRAEL and ALL countries")
    print()
    
    # Get mappings
    networks = requests.get(f"{SUPABASE_URL}/rest/v1/networks", headers=headers).json()
    network_map = {n['tadig']: n['id'] for n in networks}
    
    sources = requests.get(f"{SUPABASE_URL}/rest/v1/pricing_sources", headers=headers).json()
    source_map = {s['source_name']: s['id'] for s in sources}
    
    # Profile to operator mapping (we only have B, E, O in our system)
    profile_map = {
        'B': 'Tele2',
        'E': 'A1',
        'O': 'Telefonica'
    }
    
    total_updates = 0
    countries_updated = set()
    israel_updates = 0
    
    for country, operators in COMPLETE_IOT_COVERAGE.items():
        country_updates = 0
        
        for operator_name, data in operators.items():
            tadig = data['tadig']
            
            if tadig not in network_map:
                continue
            
            network_id = network_map[tadig]
            
            # Process each profile
            for profile in data.get('lte_m', []):
                if profile in profile_map:
                    operator = profile_map[profile]
                    if operator in source_map:
                        # Find pricing record
                        response = requests.get(
                            f"{SUPABASE_URL}/rest/v1/network_pricing?network_id=eq.{network_id}&source_id=eq.{source_map[operator]}",
                            headers=headers
                        )
                        
                        if response.status_code == 200 and response.json():
                            pricing_id = response.json()[0]['id']
                            
                            # Update LTE-M support
                            update_data = {'lte_m': True}
                            
                            # Also update NB-IoT if supported
                            if profile in data.get('nb_iot', []):
                                update_data['nb_iot'] = True
                            
                            update_response = requests.patch(
                                f"{SUPABASE_URL}/rest/v1/network_pricing?id=eq.{pricing_id}",
                                headers=headers,
                                json=update_data
                            )
                            
                            if update_response.status_code in [200, 204]:
                                total_updates += 1
                                country_updates += 1
                                if country == 'Israel':
                                    israel_updates += 1
                                    print(f"  ✓ ISRAEL - {operator_name} ({tadig}) - {operator}: LTE-M={True}, NB-IoT={update_data.get('nb_iot', False)}")
        
        if country_updates > 0:
            countries_updated.add(country)
    
    print(f"\n📊 Summary:")
    print(f"  Total updates: {total_updates}")
    print(f"  Countries updated: {len(countries_updated)}")
    print(f"  Israel updates: {israel_updates}")
    
    print(f"\n✅ COMPLETE IoT coverage import done!")
    print(f"   Israel and all other countries now show accurate IoT support")

if __name__ == "__main__":
    update_complete_iot_coverage()