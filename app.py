import os
import json
import base64
import uuid
from flask import Flask, render_template, request, jsonify, session
from langchain_openai import ChatOpenAI
from langchain.prompts import PromptTemplate
from langchain.chains import LLMChain
from dotenv import load_dotenv
from typing import Dict, Any, List, Optional

# Load environment variables
load_dotenv()

# Get OpenAI API key from environment variable
OPENAI_API_KEY = os.environ.get("OPENAI_API_KEY", "your-api-key-here")

# Initialize Flask app
app = Flask(__name__)
app.secret_key = "food_emissions_tracker_secret_key"

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
        
        # Import the necessary message types from LangChain
        from langchain_core.messages import SystemMessage, HumanMessage
        
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

@app.route('/')
def index():
    """Render the main page."""
    # Generate a session ID if not present
    if 'session_id' not in session:
        session['session_id'] = str(uuid.uuid4())
        
    return render_template('index.html')

@app.route('/analyze-food', methods=['POST'])
def analyze_food():
    """Handle food bill image uploads and analysis."""
    try:
        # Initialize variables for image and text data
        image_data = None
        text_data = request.form.get('text_description', '')
        
        # Process image upload if present
        if 'image_file' in request.files and request.files['image_file'].filename != '':
            image_file = request.files['image_file']
            
            # Check file extension
            allowed_extensions = {'png', 'jpg', 'jpeg', 'gif'}
            if '.' in image_file.filename and image_file.filename.rsplit('.', 1)[1].lower() in allowed_extensions:
                # Encode the image to base64
                image_data = encode_image(image_file)
            else:
                return jsonify({'error': 'Invalid image file format. Please upload PNG, JPG, JPEG, or GIF.'}), 400
        
        # Ensure we have at least one type of data to analyze
        if not image_data and not text_data:
            return jsonify({'error': 'Please provide either a food bill image or text description for analysis.'}), 400
        
        # Analyze the food emissions
        analysis = analyze_food_emissions(image_data, text_data)
        
        return jsonify({
            'success': True,
            'analysis': analysis,
        }), 200
        
    except Exception as e:
        return jsonify({'error': f'Error processing request: {str(e)}'}), 500

@app.route('/emission-history', methods=['GET'])
def get_emission_history():
    """
    Get the user's emission history (placeholder for future functionality).
    """
    # This is a placeholder - in a real app, you would fetch from a database
    sample_history = [
        {
            "date": "2025-04-05",
            "description": "Dinner at Italian restaurant",
            "emissions": 3.2,
            "unit": "kg CO2e"
        },
        {
            "date": "2025-04-04",
            "description": "Vegetarian lunch",
            "emissions": 1.5,
            "unit": "kg CO2e"
        },
        {
            "date": "2025-04-03",
            "description": "Breakfast with eggs and toast",
            "emissions": 0.8,
            "unit": "kg CO2e"
        }
    ]
    
    return jsonify({
        'history': sample_history
    }), 200

if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0', port=5000)