import os
import json
import base64
import uuid
import random
from flask import Flask, render_template, request, jsonify, session
from langchain_openai import ChatOpenAI
from langchain_core.messages import SystemMessage, HumanMessage
from langchain.prompts import PromptTemplate
from langchain.chains import LLMChain
from dotenv import load_dotenv
from typing import Dict, Any, List, Optional
import csv
from admin_routes import admin_bp
from user_auth import user_auth_bp, find_user, update_user_points, save_emission_history, get_user_emission_history
from flask import redirect, url_for


# Load environment variables
load_dotenv()

# Get OpenAI API key from environment variable
OPENAI_API_KEY = os.environ.get("OPENAI_API_KEY", "your-api-key-here")

# Initialize Flask app
app = Flask(__name__)
app.secret_key = "emissions_tracker_secret_key"
# Register admin blueprint
app.register_blueprint(admin_bp)
app.register_blueprint(user_auth_bp, url_prefix='/user')

# Emission thresholds for rewards
EMISSION_THRESHOLDS = {
    "food": {
        "excellent": 1.5,  # kg CO2e
        "good": 3.0,
        "average": 5.0
    },
    "electricity": {
        "excellent": 50,  # kg CO2e
        "good": 100,
        "average": 200
    },
    "water": {
        "excellent": 10,  # kg CO2e
        "good": 20,
        "average": 30
    }
}

# Reward points by threshold level
REWARD_POINTS = {
    "excellent": 50,
    "good": 25,
    "average": 10,
    "poor": 0
}

# Tree offset ratios (kg CO2 per tree per year)
TREE_OFFSET_RATIO = 25  # kg CO2 per tree per year

# Bill types configuration
BILL_TYPES = {
    "food": {
        "name": "Food",
        "description": "Analyze food bills or meal descriptions to calculate CO2 emissions",
        "icon": "utensils"
    },
    "electricity": {
        "name": "Electricity",
        "description": "Calculate CO2 emissions from your electricity consumption",
        "icon": "bolt"
    },
    "water": {
        "name": "Water",
        "description": "Estimate CO2 emissions related to your water usage",
        "icon": "water"
    }
}

def encode_image(image_file):
    """
    Encode an uploaded image file to base64.
    
    Args:
        image_file: The uploaded image file object
        
    Returns:
        Base64 encoded string of the image
    """
    encoded_image = base64.b64encode(image_file.read()).decode('utf-8')
    return encoded_image

def analyze_food_emissions(image_data=None, text_data=None):
    """
    Analyzes CO2 emissions from food using LangChain and ChatOpenAI.
    
    Args:
        image_data: Base64 encoded image data (optional)
        text_data: Text description of the food (optional)
        
    Returns:
        Analysis text with emissions data and suggestions
    """
    try:
        # Create the ChatOpenAI instance
        chat_model = ChatOpenAI(
            model_name="gpt-4o",
            temperature=0.4,
            openai_api_key=OPENAI_API_KEY
        )
        
        # Create food-specific prompt with improved formatting instructions and mobile-friendly HTML
        food_emissions_prompt = """
        You are an expert CO2 emissions analyst specializing in food carbon footprints. Your task is to analyze 
        the provided food bill or meal information and calculate the approximate CO2 emissions.
        
        **Instructions**:
        1. **Identify the Food Items**:
           - Carefully extract all food items from the bill/image or description.
           - Determine if each food item is vegetarian or non-vegetarian.
           - List each food item with its classification (veg/non-veg).
        
        2. **Calculate Carbon Emissions**:
           - Use standard carbon emission factors to calculate the CO2 emissions for each food item.
           - Provide the carbon emission factors used for each food item (in CO2e per kg or serving).
           - Be specific about Indian food items and their emissions if possible.
        
        3. **Provide a Breakdown**:
           - Detail the carbon emissions for each food item separately.
           - Summarize the total carbon emissions for the entire meal or bill.
        
        4. **Provide Actionable Recommendations**:
           - Suggest 2-3 specific ways to reduce the carbon footprint of this meal.
           - Recommend alternative ingredients or food items that would have lower emissions.
        
        5. **Format Your Response (VERY IMPORTANT)**:
           - START your response with a highlighted summary box containing the TOTAL CO2 EMISSIONS value.
           - Use HTML for formatting. Your response will be displayed directly in a web application.
           - Make your response mobile-friendly with responsive tables and appropriate font sizes.
           - Keep table column count minimal (3-4 columns maximum) for better mobile viewing.
           - Use colors to highlight important information (e.g., total emissions in green, high-emission foods in amber/orange).
           - Include a final section with clear, visualized recommendations.
           - Use the following structure WITHOUT markdown code blocks (don't include ```html or ``` in your response):
           
        <div style="background-color: #e8f5e9; padding: 15px; border-radius: 8px; margin-bottom: 20px; text-align: center;">
          <h2 style="color: #2e7d32; margin: 0; font-size: 1.5rem;">Total Carbon Footprint: X.XX kg CO2e</h2>
        </div>
        
        <h3 style="font-size: 1.3rem; margin-top: 20px;">Meal Analysis</h3>
        <p>Brief description of what was analyzed...</p>
        
        <h3 style="font-size: 1.3rem; margin-top: 20px;">Food Items</h3>
        <div style="overflow-x: auto;">
          <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px; min-width: 250px;">
            <tr style="background-color: #f5f5f5;">
              <th style="padding: 10px; border: 1px solid #ddd; text-align: left;">Food Item</th>
              <th style="padding: 10px; border: 1px solid #ddd; text-align: left;">Category</th>
            </tr>
            <tr>
              <td style="padding: 10px; border: 1px solid #ddd;">Food item 1</td>
              <td style="padding: 10px; border: 1px solid #ddd;">Vegetarian/Non-vegetarian</td>
            </tr>
            <!-- More rows as needed -->
          </table>
        </div>
        
        <h3 style="font-size: 1.3rem; margin-top: 20px;">Carbon Emissions Breakdown</h3>
        <div style="overflow-x: auto;">
          <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px; min-width: 300px;">
            <tr style="background-color: #f5f5f5;">
              <th style="padding: 10px; border: 1px solid #ddd; text-align: left;">Food Item</th>
              <th style="padding: 10px; border: 1px solid #ddd; text-align: right;">Quantity</th>
              <th style="padding: 10px; border: 1px solid #ddd; text-align: right;">CO2e (kg)</th>
            </tr>
            <tr>
              <td style="padding: 10px; border: 1px solid #ddd;">Food item 1</td>
              <td style="padding: 10px; border: 1px solid #ddd; text-align: right;">XXX g</td>
              <td style="padding: 10px; border: 1px solid #ddd; text-align: right;">X.XX kg</td>
            </tr>
            <!-- More rows as needed -->
            <tr style="background-color: #e8f5e9; font-weight: bold;">
              <td style="padding: 10px; border: 1px solid #ddd;" colspan="2">Total Emissions</td>
              <td style="padding: 10px; border: 1px solid #ddd; text-align: right;">X.XX kg</td>
            </tr>
          </table>
        </div>
        
        <h3 style="font-size: 1.3rem; margin-top: 20px;">Recommendations to Reduce Your Carbon Footprint</h3>
        <ol style="padding-left: 25px;">
          <li style="margin-bottom: 10px;"><strong>Recommendation 1:</strong> Details...</li>
          <li style="margin-bottom: 10px;"><strong>Recommendation 2:</strong> Details...</li>
          <li style="margin-bottom: 10px;"><strong>Recommendation 3:</strong> Details...</li>
        </ol>
        
        Perform a thorough analysis and provide accurate CO2 emission calculations based on the information visible in the image or described in the text.
        """
        
        if image_data:
            # Create the system message
            system_message = SystemMessage(content=food_emissions_prompt)
            
            # Create the human message with image content
            human_content = [
                {"type": "text", "text": "Please analyze this food bill or meal for CO2 emissions:"},
                {"type": "image_url", "image_url": {"url": f"data:image/jpeg;base64,{image_data}"}}
            ]
            human_message = HumanMessage(content=human_content)
            
            # Create the messages list
            messages = [system_message, human_message]
            
            # Invoke the model with the messages
            image_response = chat_model.invoke(messages)
            
            # Clean up the response to remove code block markers if present
            response_content = image_response.content
            # Remove markdown code block indicators if present
            response_content = response_content.replace("```html", "").replace("```", "")
            return response_content
        elif text_data:
            # For text-only analysis
            system_message = SystemMessage(content=food_emissions_prompt)
            human_message = HumanMessage(content=f"Please analyze the following food description for CO2 emissions: {text_data}")
            
            # Create the messages list
            messages = [system_message, human_message]
            
            # Invoke the model with the messages
            text_response = chat_model.invoke(messages)
            
            # Clean up the response to remove code block markers if present
            response_content = text_response.content
            # Remove markdown code block indicators if present
            response_content = response_content.replace("```html", "").replace("```", "")
            return response_content
        else:
            return "Please provide either an image of your food/bill or a text description for analysis."
                
    except Exception as e:
        return f"Error during analysis: {str(e)}"

def analyze_electricity_emissions(image_data=None, text_data=None):
    """
    Analyzes CO2 emissions from electricity bills using LangChain and ChatOpenAI.
    
    Args:
        image_data: Base64 encoded image data (optional)
        text_data: Text description of the electricity usage (optional)
        
    Returns:
        Analysis text with emissions data and suggestions
    """
    try:
        # Create the ChatOpenAI instance
        chat_model = ChatOpenAI(
            model_name="gpt-4o",
            temperature=0.4,
            openai_api_key=OPENAI_API_KEY
        )
        
        # Create electricity-specific prompt with improved formatting instructions
        electricity_emissions_prompt = """
        You are an expert CO2 emissions analyst specializing in electricity carbon footprints. Your task is to analyze 
        the provided electricity bill or consumption information and calculate the approximate CO2 emissions.
        
        **Instructions**:
        1. **Extract Key Information**:
           - Carefully extract the electricity consumption (kWh) from the bill/image or description.
           - Identify the billing period (month/year).
           - Note any breakdown between peak/off-peak usage if available.
           - Check for any renewable energy credits or green energy information.
        
        2. **Calculate Carbon Emissions**:
           - Use standard carbon emission factors to calculate the CO2 emissions from electricity usage.
           - For India, use approximately 0.82 kg CO2e per kWh unless specific regional data is provided.
           - For the US, use approximately 0.42 kg CO2e per kWh.
           - For the EU, use approximately 0.28 kg CO2e per kWh.
           - If the location is not specified, use the global average of 0.475 kg CO2e per kWh.
        
        3. **Provide a Breakdown**:
           - Detail the emissions calculation with clear steps.
           - If possible, break down by appliance usage (e.g., air conditioning, refrigeration, lighting).
        
        4. **Provide Actionable Recommendations**:
           - Suggest 3-4 specific ways to reduce electricity consumption and carbon footprint.
           - Recommend energy-efficient alternatives where possible.
        
        5. **Format Your Response (VERY IMPORTANT)**:
           - START your response with a highlighted summary box containing the TOTAL CO2 EMISSIONS value.
           - Use HTML for formatting. Your response will be displayed directly in a web application.
           - Make your response mobile-friendly with responsive tables and appropriate font sizes.
           - Keep table column count minimal (3-4 columns maximum) for better mobile viewing.
           - Use colors to highlight important information (e.g., total emissions in green, high-emission categories in amber/orange).
           - Include a final section with clear, visualized recommendations.
           - Use the following structure WITHOUT markdown code blocks:
           
        <div style="background-color: #e3f2fd; padding: 15px; border-radius: 8px; margin-bottom: 20px; text-align: center;">
          <h2 style="color: #1565c0; margin: 0; font-size: 1.5rem;">Total Carbon Footprint: X.XX kg CO2e</h2>
        </div>
        
        <h3 style="font-size: 1.3rem; margin-top: 20px;">Electricity Usage Analysis</h3>
        <p>Brief description of what was analyzed...</p>
        
        <h3 style="font-size: 1.3rem; margin-top: 20px;">Usage Details</h3>
        <div style="overflow-x: auto;">
          <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px; min-width: 250px;">
            <tr style="background-color: #f5f5f5;">
              <th style="padding: 10px; border: 1px solid #ddd; text-align: left;">Item</th>
              <th style="padding: 10px; border: 1px solid #ddd; text-align: right;">Value</th>
            </tr>
            <tr>
              <td style="padding: 10px; border: 1px solid #ddd;">Total Consumption</td>
              <td style="padding: 10px; border: 1px solid #ddd; text-align: right;">XXX kWh</td>
            </tr>
            <tr>
              <td style="padding: 10px; border: 1px solid #ddd;">Billing Period</td>
              <td style="padding: 10px; border: 1px solid #ddd; text-align: right;">Month Year</td>
            </tr>
            <!-- More rows as needed -->
          </table>
        </div>
        
        <h3 style="font-size: 1.3rem; margin-top: 20px;">Carbon Emissions Breakdown</h3>
        <div style="overflow-x: auto;">
          <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px; min-width: 300px;">
            <tr style="background-color: #f5f5f5;">
              <th style="padding: 10px; border: 1px solid #ddd; text-align: left;">Category</th>
              <th style="padding: 10px; border: 1px solid #ddd; text-align: right;">Usage (kWh)</th>
              <th style="padding: 10px; border: 1px solid #ddd; text-align: right;">CO2e (kg)</th>
            </tr>
            <tr>
              <td style="padding: 10px; border: 1px solid #ddd;">Category 1</td>
              <td style="padding: 10px; border: 1px solid #ddd; text-align: right;">XXX kWh</td>
              <td style="padding: 10px; border: 1px solid #ddd; text-align: right;">X.XX kg</td>
            </tr>
            <!-- More rows as needed -->
            <tr style="background-color: #e3f2fd; font-weight: bold;">
              <td style="padding: 10px; border: 1px solid #ddd;" colspan="2">Total Emissions</td>
              <td style="padding: 10px; border: 1px solid #ddd; text-align: right;">X.XX kg</td>
            </tr>
          </table>
        </div>
        
        <h3 style="font-size: 1.3rem; margin-top: 20px;">Recommendations to Reduce Your Carbon Footprint</h3>
        <ol style="padding-left: 25px;">
          <li style="margin-bottom: 10px;"><strong>Recommendation 1:</strong> Details...</li>
          <li style="margin-bottom: 10px;"><strong>Recommendation 2:</strong> Details...</li>
          <li style="margin-bottom: 10px;"><strong>Recommendation 3:</strong> Details...</li>
        </ol>
        
        Perform a thorough analysis and provide accurate CO2 emission calculations based on the information visible in the image or described in the text.
        """
        
        if image_data:
            # Create the system message
            system_message = SystemMessage(content=electricity_emissions_prompt)
            
            # Create the human message with image content
            human_content = [
                {"type": "text", "text": "Please analyze this electricity bill for CO2 emissions:"},
                {"type": "image_url", "image_url": {"url": f"data:image/jpeg;base64,{image_data}"}}
            ]
            human_message = HumanMessage(content=human_content)
            
            # Create the messages list
            messages = [system_message, human_message]
            
            # Invoke the model with the messages
            image_response = chat_model.invoke(messages)
            
            # Clean up the response to remove code block markers if present
            response_content = image_response.content
            # Remove markdown code block indicators if present
            response_content = response_content.replace("```html", "").replace("```", "")
            return response_content
        elif text_data:
            # For text-only analysis
            system_message = SystemMessage(content=electricity_emissions_prompt)
            human_message = HumanMessage(content=f"Please analyze the following electricity consumption information for CO2 emissions: {text_data}")
            
            # Create the messages list
            messages = [system_message, human_message]
            
            # Invoke the model with the messages
            text_response = chat_model.invoke(messages)
            
            # Clean up the response to remove code block markers if present
            response_content = text_response.content
            # Remove markdown code block indicators if present
            response_content = response_content.replace("```html", "").replace("```", "")
            return response_content
        else:
            return "Please provide either an image of your electricity bill or a text description of your electricity usage."
                
    except Exception as e:
        return f"Error during analysis: {str(e)}"

def analyze_water_emissions(image_data=None, text_data=None):
    """
    Analyzes CO2 emissions from water bills using LangChain and ChatOpenAI.
    
    Args:
        image_data: Base64 encoded image data (optional)
        text_data: Text description of the water usage (optional)
        
    Returns:
        Analysis text with emissions data and suggestions
    """
    try:
        # Create the ChatOpenAI instance
        chat_model = ChatOpenAI(
            model_name="gpt-4o",
            temperature=0.4,
            openai_api_key=OPENAI_API_KEY
        )
        
        # Create water-specific prompt with improved formatting instructions
        water_emissions_prompt = """
        You are an expert CO2 emissions analyst specializing in water-related carbon footprints. Your task is to analyze 
        the provided water bill or consumption information and calculate the approximate CO2 emissions.
        
        **Instructions**:
        1. **Extract Key Information**:
           - Carefully extract the water consumption (gallons, liters, or cubic meters) from the bill/image or description.
           - Identify the billing period (month/year).
           - Note any breakdown between hot and cold water if available.
           - Check for any water treatment or recycling information.
        
        2. **Calculate Carbon Emissions**:
           - Use standard carbon emission factors to calculate the CO2 emissions from water usage.
           - For water supply: use approximately 0.3 kg CO2e per cubic meter.
           - For wastewater treatment: use approximately 0.23 kg CO2e per cubic meter.
           - For water heating (if applicable): use approximately 0.19 kg CO2e per kWh for heating.
           - Convert units as needed (1 cubic meter = 1000 liters = 264.17 US gallons).
        
        3. **Provide a Breakdown**:
           - Detail the emissions calculation with clear steps.
           - If possible, break down by water usage category (e.g., bathing, laundry, dishes, irrigation).
        
        4. **Provide Actionable Recommendations**:
           - Suggest 3-4 specific ways to reduce water consumption and carbon footprint.
           - Recommend water-efficient alternatives where possible.
        
        5. **Format Your Response (VERY IMPORTANT)**:
           - START your response with a highlighted summary box containing the TOTAL CO2 EMISSIONS value.
           - Use HTML for formatting. Your response will be displayed directly in a web application.
           - Make your response mobile-friendly with responsive tables and appropriate font sizes.
           - Keep table column count minimal (3-4 columns maximum) for better mobile viewing.
           - Use colors to highlight important information (e.g., total emissions in blue, high-emission categories in darker blue).
           - Include a final section with clear, visualized recommendations.
           - Use the following structure WITHOUT markdown code blocks:
           
        <div style="background-color: #e1f5fe; padding: 15px; border-radius: 8px; margin-bottom: 20px; text-align: center;">
          <h2 style="color: #0277bd; margin: 0; font-size: 1.5rem;">Total Carbon Footprint: X.XX kg CO2e</h2>
        </div>
        
        <h3 style="font-size: 1.3rem; margin-top: 20px;">Water Usage Analysis</h3>
        <p>Brief description of what was analyzed...</p>
        
        <h3 style="font-size: 1.3rem; margin-top: 20px;">Usage Details</h3>
        <div style="overflow-x: auto;">
          <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px; min-width: 250px;">
            <tr style="background-color: #f5f5f5;">
              <th style="padding: 10px; border: 1px solid #ddd; text-align: left;">Item</th>
              <th style="padding: 10px; border: 1px solid #ddd; text-align: right;">Value</th>
            </tr>
            <tr>
              <td style="padding: 10px; border: 1px solid #ddd;">Total Consumption</td>
              <td style="padding: 10px; border: 1px solid #ddd; text-align: right;">XXX cubic meters</td>
            </tr>
            <tr>
              <td style="padding: 10px; border: 1px solid #ddd;">Billing Period</td>
              <td style="padding: 10px; border: 1px solid #ddd; text-align: right;">Month Year</td>
            </tr>
            <!-- More rows as needed -->
          </table>
        </div>
        
        <h3 style="font-size: 1.3rem; margin-top: 20px;">Carbon Emissions Breakdown</h3>
        <div style="overflow-x: auto;">
          <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px; min-width: 300px;">
            <tr style="background-color: #f5f5f5;">
              <th style="padding: 10px; border: 1px solid #ddd; text-align: left;">Category</th>
              <th style="padding: 10px; border: 1px solid #ddd; text-align: right;">Usage</th>
              <th style="padding: 10px; border: 1px solid #ddd; text-align: right;">CO2e (kg)</th>
            </tr>
            <tr>
              <td style="padding: 10px; border: 1px solid #ddd;">Water Supply</td>
              <td style="padding: 10px; border: 1px solid #ddd; text-align: right;">XXX cubic meters</td>
              <td style="padding: 10px; border: 1px solid #ddd; text-align: right;">X.XX kg</td>
            </tr>
            <tr>
              <td style="padding: 10px; border: 1px solid #ddd;">Wastewater Treatment</td>
              <td style="padding: 10px; border: 1px solid #ddd; text-align: right;">XXX cubic meters</td>
              <td style="padding: 10px; border: 1px solid #ddd; text-align: right;">X.XX kg</td>
            </tr>
            <!-- More rows as needed -->
            <tr style="background-color: #e1f5fe; font-weight: bold;">
              <td style="padding: 10px; border: 1px solid #ddd;" colspan="2">Total Emissions</td>
              <td style="padding: 10px; border: 1px solid #ddd; text-align: right;">X.XX kg</td>
            </tr>
          </table>
        </div>
        
        <h3 style="font-size: 1.3rem; margin-top: 20px;">Recommendations to Reduce Your Carbon Footprint</h3>
        <ol style="padding-left: 25px;">
          <li style="margin-bottom: 10px;"><strong>Recommendation 1:</strong> Details...</li>
          <li style="margin-bottom: 10px;"><strong>Recommendation 2:</strong> Details...</li>
          <li style="margin-bottom: 10px;"><strong>Recommendation 3:</strong> Details...</li>
        </ol>
        
        Perform a thorough analysis and provide accurate CO2 emission calculations based on the information visible in the image or described in the text.
        """
        
        if image_data:
            # Create the system message
            system_message = SystemMessage(content=water_emissions_prompt)
            
            # Create the human message with image content
            human_content = [
                {"type": "text", "text": "Please analyze this water bill for CO2 emissions:"},
                {"type": "image_url", "image_url": {"url": f"data:image/jpeg;base64,{image_data}"}}
            ]
            human_message = HumanMessage(content=human_content)
            
            # Create the messages list
            messages = [system_message, human_message]
            
            # Invoke the model with the messages
            image_response = chat_model.invoke(messages)
            
            # Clean up the response to remove code block markers if present
            response_content = image_response.content
            # Remove markdown code block indicators if present
            response_content = response_content.replace("```html", "").replace("```", "")
            return response_content
        elif text_data:
            # For text-only analysis
            system_message = SystemMessage(content=water_emissions_prompt)
            human_message = HumanMessage(content=f"Please analyze the following water consumption information for CO2 emissions: {text_data}")
            
            # Create the messages list
            messages = [system_message, human_message]
            
            # Invoke the model with the messages
            text_response = chat_model.invoke(messages)
            
            # Clean up the response to remove code block markers if present
            response_content = text_response.content
            # Remove markdown code block indicators if present
            response_content = response_content.replace("```html", "").replace("```", "")
            return response_content
        else:
            return "Please provide either an image of your water bill or a text description of your water usage."
                
    except Exception as e:
        return f"Error during analysis: {str(e)}"

def extract_emissions_value(analysis_text):
    """
    Extract the CO2 emissions value from the analysis text.
    
    Args:
        analysis_text: The text to extract from
        
    Returns:
        Float representing the CO2 emissions value in kg
    """
    # Try different regex patterns to match emissions values
    patterns = [
        r'Carbon Footprint:\s*(\d+\.\d+)\s*kg\s*CO2e',
        r'(\d+\.\d+)\s*kg\s*CO2e',
        r'total emissions\D*(\d+\.\d+)',
        r'total carbon footprint\D*(\d+\.\d+)',
        r'(\d+\.\d+)\s*kg'
    ]
    
    for pattern in patterns:
        import re
        match = re.search(pattern, analysis_text, re.IGNORECASE)
        if match and match.group(1):
            try:
                return float(match.group(1))
            except ValueError:
                continue
    
    # If no match found, make an estimate based on bill type
    # This is a fallback method for demo purposes
    if "electricity" in analysis_text.lower():
        return random.uniform(80, 120)
    elif "water" in analysis_text.lower():
        return random.uniform(15, 25)
    else:  # Food
        return random.uniform(2, 5)

def calculate_rewards(emissions, bill_type):
    """
    Calculate rewards based on emissions and bill type.
    
    Args:
        emissions: The CO2 emissions value in kg
        bill_type: The type of bill (food, electricity, water)
        
    Returns:
        Dict with reward points and level
    """
    # Get thresholds for this bill type
    thresholds = EMISSION_THRESHOLDS.get(bill_type, {
        "excellent": 5,
        "good": 10,
        "average": 20
    })
    
    # Determine reward level
    if emissions <= thresholds["excellent"]:
        level = "excellent"
    elif emissions <= thresholds["good"]:
        level = "good"
    elif emissions <= thresholds["average"]:
        level = "average"
    else:
        level = "poor"
    
    # Calculate points
    points = REWARD_POINTS.get(level, 0)
    
    return {
        "level": level,
        "points": points,
        "message": get_reward_message(level)
    }

def get_reward_message(level):
    """Get a motivational message based on reward level."""
    messages = {
        "excellent": "Outstanding! Your emissions are well below average. Keep up the great work!",
        "good": "Great job! Your emissions are better than average. You're making a positive impact!",
        "average": "Good effort! Your emissions are around average. Small changes can make a big difference!",
        "poor": "There's room for improvement. Check out our recommendations to reduce your emissions."
    }
    return messages.get(level, "")

def calculate_trees_needed(emissions):
    """
    Calculate the number of trees needed to offset emissions.
    
    Args:
        emissions: The CO2 emissions value in kg
        
    Returns:
        Float representing the number of trees needed
    """
    return emissions / TREE_OFFSET_RATIO

@app.route('/')
def index():
    """Render the main page."""
    # Generate a session ID if not present
    if 'session_id' not in session:
        session['session_id'] = str(uuid.uuid4())
    
    return render_template('index.html', bill_types=BILL_TYPES)

@app.route('/analyze-bill', methods=['POST'])
def analyze_bill():
    """Handle bill image uploads and analysis."""
    try:
        # Get bill type
        bill_type = request.form.get('bill_type', 'food')
        
        # Validate bill type
        if bill_type not in BILL_TYPES:
            return jsonify({'error': f'Invalid bill type: {bill_type}'}), 400
        
        # Initialize variables for image data
        image_data = None
        
        # Process image upload if present
        if f'{bill_type}_image_file' in request.files and request.files[f'{bill_type}_image_file'].filename != '':
            image_file = request.files[f'{bill_type}_image_file']
            
            # Check file extension
            allowed_extensions = {'png', 'jpg', 'jpeg', 'gif'}
            if '.' in image_file.filename and image_file.filename.rsplit('.', 1)[1].lower() in allowed_extensions:
                # Encode the image to base64
                image_data = encode_image(image_file)
            else:
                return jsonify({'error': 'Invalid image file format. Please upload PNG, JPG, JPEG, or GIF.'}), 400
        
        # Ensure we have an image to analyze
        if not image_data:
            return jsonify({'error': f'Please provide a {bill_type} bill image for analysis.'}), 400
        
        # Call the appropriate analysis function based on bill type
        if bill_type == 'food':
            analysis = analyze_food_emissions(image_data, None)
        elif bill_type == 'electricity':
            analysis = analyze_electricity_emissions(image_data, None)
        elif bill_type == 'water':
            analysis = analyze_water_emissions(image_data, None)
        else:
            return jsonify({'error': 'Unsupported bill type.'}), 400
        
        # Extract emissions value
        emissions = extract_emissions_value(analysis)
        
        # Calculate rewards
        rewards = calculate_rewards(emissions, bill_type)
        
        # Calculate trees needed
        trees_needed = calculate_trees_needed(emissions)
        
        return jsonify({
            'success': True,
            'bill_type': bill_type,
            'analysis': analysis,
            'emissions': emissions,
            'rewards': rewards,
            'trees_needed': trees_needed
        }), 200
        
    except Exception as e:
        return jsonify({'error': f'Error processing request: {str(e)}'}), 500

# Add a new route to save results to user history
@app.route('/save-to-history', methods=['POST'])
def save_to_history():
    """Save analysis results to user history."""
    try:
        # Check if user is logged in
        if 'user_id' not in session:
            return jsonify({
                'success': False,
                'error': 'You must be logged in to save results',
                'redirect': url_for('user_auth.login')
            }), 401
        
        data = request.json
        user_id = session.get('user_id')
        
        bill_type = data.get('bill_type')
        description = data.get('description', f"{BILL_TYPES[bill_type]['name']} bill analysis")
        emissions = float(data.get('emissions', 0))
        unit = data.get('unit', 'kg CO2e')
        
        # Handle different reward formats - fix for the error
        rewards_data = data.get('rewards', 0)
        if isinstance(rewards_data, dict):
            # If rewards is a dictionary with 'points' key
            rewards = int(rewards_data.get('points', 0))
        elif isinstance(rewards_data, (int, float, str)):
            # If rewards is directly a number or string
            rewards = int(float(rewards_data))
        else:
            # Default case
            rewards = 0
        
        # Save to emission history
        save_success = save_emission_history(
            user_id, bill_type, description, emissions, unit, rewards
        )
        
        if not save_success:
            return jsonify({
                'success': False,
                'error': 'Failed to save emission history'
            }), 500
        
        # Update user points
        update_success, updated_points = update_user_points(user_id, rewards)
        
        if not update_success:
            return jsonify({
                'success': False,
                'error': 'Failed to update user points'
            }), 500
        
        # Update session
        session['user_points'] = updated_points
        
        return jsonify({
            'success': True,
            'message': 'Result saved successfully',
            'updated_points': updated_points
        })
    
    except Exception as e:
        import traceback
        print(f"Error saving to history: {str(e)}")
        print(traceback.format_exc())  # Print the full stack trace
        return jsonify({
            'error': f'Error saving to history: {str(e)}'
        }), 500

@app.route('/analyze-multiple', methods=['POST'])
def analyze_multiple():
    """Handle multiple bill analysis."""
    try:
        # Initialize results
        results = {}
        total_emissions = 0
        total_rewards = 0
        total_trees = 0
        
        # Process each bill type
        for bill_type in BILL_TYPES:
            # Check if this bill type was submitted
            if f'{bill_type}_submitted' in request.form and request.form.get(f'{bill_type}_submitted') == 'true':
                # Initialize variables for image data
                image_data = None
                
                # Process image upload if present
                if f'{bill_type}_image_file' in request.files and request.files[f'{bill_type}_image_file'].filename != '':
                    image_file = request.files[f'{bill_type}_image_file']
                    
                    # Check file extension
                    allowed_extensions = {'png', 'jpg', 'jpeg', 'gif'}
                    if '.' in image_file.filename and image_file.filename.rsplit('.', 1)[1].lower() in allowed_extensions:
                        # Encode the image to base64
                        image_data = encode_image(image_file)
                    else:
                        return jsonify({'error': f'Invalid {bill_type} image file format. Please upload PNG, JPG, JPEG, or GIF.'}), 400
                
                # Ensure we have an image to analyze
                if not image_data:
                    continue
                
                # Call the appropriate analysis function based on bill type
                if bill_type == 'food':
                    analysis = analyze_food_emissions(image_data, None)
                elif bill_type == 'electricity':
                    analysis = analyze_electricity_emissions(image_data, None)
                elif bill_type == 'water':
                    analysis = analyze_water_emissions(image_data, None)
                else:
                    continue
                
                # Extract emissions value
                emissions = extract_emissions_value(analysis)
                
                # Calculate rewards
                rewards = calculate_rewards(emissions, bill_type)
                
                # Calculate trees needed
                trees_needed = calculate_trees_needed(emissions)
                
                # Add to results
                results[bill_type] = {
                    'analysis': analysis,
                    'emissions': emissions,
                    'rewards': rewards,
                    'trees_needed': trees_needed
                }
                
                # Add to totals
                total_emissions += emissions
                total_rewards += rewards['points']
                total_trees += trees_needed
        
        # Check if we have any results
        if not results:
            return jsonify({'error': 'Please provide at least one bill image for analysis.'}), 400
        
        return jsonify({
            'success': True,
            'results': results,
            'total_emissions': total_emissions,
            'total_rewards': total_rewards,
            'total_trees_needed': total_trees
        }), 200
        
    except Exception as e:
        return jsonify({'error': f'Error processing request: {str(e)}'}), 500

@app.route('/emission-history')
def get_emission_history():
    """
    Get the user's emission history.
    """
    # Check if user is logged in
    if 'user_id' not in session:
        # Return empty history if not logged in
        return jsonify({
            'history': []
        }), 200
    
    # Get user's emission history
    user_id = session.get('user_id')
    history = get_user_emission_history(user_id)
    
    return jsonify({
        'history': history
    }), 200

@app.route('/rewards-info', methods=['GET'])
def get_rewards_info():
    """
    Get information about the rewards system.
    """
    return jsonify({
        'thresholds': EMISSION_THRESHOLDS,
        'points': REWARD_POINTS,
        'tree_offset_ratio': TREE_OFFSET_RATIO
    }), 200

if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0', port=5000)